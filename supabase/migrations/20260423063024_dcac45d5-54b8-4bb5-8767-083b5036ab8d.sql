-- Profiles: referral code + free meal credits
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS free_meal_credits INTEGER NOT NULL DEFAULT 0;

-- Orders: order code + free meal applied flag
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS order_code TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS free_meal_applied BOOLEAN NOT NULL DEFAULT false;

-- Referrals table
CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL,
  referred_user_id UUID NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending',
  qualified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id);

CREATE POLICY "Admins view all referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Helper: generate a random short code
CREATE OR REPLACE FUNCTION public.generate_short_code(len INTEGER)
RETURNS TEXT
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..len LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Backfill referral codes for existing profiles
DO $$
DECLARE
  r RECORD;
  new_code TEXT;
BEGIN
  FOR r IN SELECT id FROM public.profiles WHERE referral_code IS NULL LOOP
    LOOP
      new_code := public.generate_short_code(6);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_code);
    END LOOP;
    UPDATE public.profiles SET referral_code = new_code WHERE id = r.id;
  END LOOP;
END $$;

-- Backfill order codes for existing orders
DO $$
DECLARE
  o RECORD;
  new_code TEXT;
BEGIN
  FOR o IN SELECT id FROM public.orders WHERE order_code IS NULL LOOP
    LOOP
      new_code := public.generate_short_code(8);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_code = new_code);
    END LOOP;
    UPDATE public.orders SET order_code = new_code WHERE id = o.id;
  END LOOP;
END $$;

-- Update handle_new_user to generate referral code and create referral row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role public.app_role;
  new_ref_code TEXT;
  ref_code_input TEXT;
  referrer_profile_id UUID;
BEGIN
  -- Generate unique referral code
  LOOP
    new_ref_code := public.generate_short_code(6);
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.profiles WHERE referral_code = new_ref_code);
  END LOOP;

  INSERT INTO public.profiles (id, full_name, phone, referral_code)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    new_ref_code
  );

  IF (NEW.raw_user_meta_data->>'is_admin_signup') = 'true' THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'customer';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);

  -- Handle referral code from signup metadata
  ref_code_input := NEW.raw_user_meta_data->>'referral_code';
  IF ref_code_input IS NOT NULL AND length(ref_code_input) > 0 THEN
    SELECT id INTO referrer_profile_id
    FROM public.profiles
    WHERE referral_code = upper(ref_code_input)
    LIMIT 1;

    IF referrer_profile_id IS NOT NULL AND referrer_profile_id <> NEW.id THEN
      INSERT INTO public.referrals (referrer_id, referred_user_id, status)
      VALUES (referrer_profile_id, NEW.id, 'pending')
      ON CONFLICT (referred_user_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure trigger exists on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: assign order_code on insert
CREATE OR REPLACE FUNCTION public.assign_order_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
BEGIN
  IF NEW.order_code IS NULL THEN
    LOOP
      new_code := public.generate_short_code(8);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.orders WHERE order_code = new_code);
    END LOOP;
    NEW.order_code := new_code;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_order_code ON public.orders;
CREATE TRIGGER trg_assign_order_code
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.assign_order_code();

-- Function: mark order delivered (admin only) + qualify referral
CREATE OR REPLACE FUNCTION public.mark_order_delivered(_order_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_order RECORD;
  prior_delivered_count INTEGER;
  ref_row RECORD;
  qualified_count INTEGER;
  meals_earned INTEGER;
  current_credits INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT * INTO target_order FROM public.orders WHERE order_code = upper(_order_code) LIMIT 1;
  IF target_order IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order not found');
  END IF;

  IF target_order.status = 'delivered' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Order already delivered', 'order_id', target_order.id);
  END IF;

  UPDATE public.orders
    SET status = 'delivered',
        payment_status = CASE WHEN payment_method = 'cash_on_delivery' THEN 'paid' ELSE payment_status END,
        updated_at = now()
    WHERE id = target_order.id;

  -- Referral qualification: only on the user's first delivered order
  IF target_order.user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO prior_delivered_count
      FROM public.orders
      WHERE user_id = target_order.user_id
        AND status = 'delivered'
        AND id <> target_order.id;

    IF prior_delivered_count = 0 THEN
      SELECT * INTO ref_row FROM public.referrals
        WHERE referred_user_id = target_order.user_id AND status = 'pending'
        LIMIT 1;

      IF ref_row IS NOT NULL THEN
        UPDATE public.referrals
          SET status = 'qualified', qualified_at = now()
          WHERE id = ref_row.id;

        SELECT COUNT(*) INTO qualified_count
          FROM public.referrals
          WHERE referrer_id = ref_row.referrer_id AND status = 'qualified';

        SELECT free_meal_credits INTO current_credits
          FROM public.profiles WHERE id = ref_row.referrer_id;

        meals_earned := (qualified_count / 5) - COALESCE((current_credits + (
          SELECT COUNT(*) FROM public.orders
          WHERE user_id = ref_row.referrer_id AND free_meal_applied = true
        )), 0);

        IF meals_earned > 0 THEN
          UPDATE public.profiles
            SET free_meal_credits = free_meal_credits + meals_earned
            WHERE id = ref_row.referrer_id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'order_id', target_order.id,
    'customer_name', target_order.customer_name,
    'total', target_order.total
  );
END;
$$;

-- Function: decrement free meal credit (called when an order applies a credit)
CREATE OR REPLACE FUNCTION public.consume_free_meal_credit(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_credits INTEGER;
BEGIN
  IF auth.uid() <> _user_id AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT free_meal_credits INTO current_credits FROM public.profiles WHERE id = _user_id;
  IF current_credits IS NULL OR current_credits <= 0 THEN
    RETURN false;
  END IF;

  UPDATE public.profiles SET free_meal_credits = free_meal_credits - 1 WHERE id = _user_id;
  RETURN true;
END;
$$;