import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Trash2, Banknote, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/format";

type PaymentMethod = "cash_on_delivery" | "paystack";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const orderSchema = z.object({
  customer_name: z.string().trim().min(1, "Name is required").max(100),
  delivery_address: z.string().trim().min(5, "Address is required").max(500),
});

export function CartDrawer({ open, onOpenChange }: Props) {
  const { items, total, setQty, remove, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash_on_delivery");
  const [submitting, setSubmitting] = useState(false);
  const [credits, setCredits] = useState(0);
  const [useCredit, setUseCredit] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    supabase
      .from("profiles")
      .select("free_meal_credits")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setCredits(data?.free_meal_credits ?? 0));
  }, [open, user]);

  // Auto-suggest using credit when available
  useEffect(() => {
    if (credits > 0 && items.length > 0) setUseCredit(true);
    else setUseCredit(false);
  }, [credits, items.length]);

  const cheapest = items.length ? Math.min(...items.map((i) => i.price)) : 0;
  const discount = useCredit && credits > 0 ? cheapest : 0;
  const finalTotal = Math.max(0, total - discount);

  const submit = async () => {
    if (!user) {
      toast.info("Please log in to place your order");
      onOpenChange(false);
      navigate({ to: "/login" });
      return;
    }
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    const parsed = orderSchema.safeParse({ customer_name: name, delivery_address: address });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);

    const willUseCredit = useCredit && credits > 0;
    if (willUseCredit) {
      const { data: ok, error: credErr } = await supabase.rpc("consume_free_meal_credit", {
        _user_id: user.id,
      });
      if (credErr || !ok) {
        setSubmitting(false);
        toast.error("Could not apply free meal credit");
        return;
      }
    }

    const { data: inserted, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        customer_name: parsed.data.customer_name,
        delivery_address: parsed.data.delivery_address,
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          quantity: i.quantity,
        })),
        total: finalTotal,
        status: "pending",
        payment_method: paymentMethod,
        payment_status: paymentMethod === "cash_on_delivery" ? "pending" : "awaiting_payment",
        free_meal_applied: willUseCredit,
      })
      .select("id")
      .single();
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (paymentMethod === "paystack") {
      toast.success("Order placed! Online payment will be available shortly.");
    } else {
      toast.success("Order placed! Pay on delivery.");
    }
    clear();
    setName("");
    setAddress("");
    onOpenChange(false);
    if (inserted?.id) {
      navigate({ to: "/receipt/$id", params: { id: inserted.id } });
    } else {
      navigate({ to: "/orders" });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-xl">Your Order</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {items.length === 0 ? (
            <div className="grid place-items-center py-16 text-center">
              <ShoppingCart className="h-10 w-10 text-muted-foreground/60" />
              <p className="mt-3 font-medium text-primary">Your order is empty</p>
              <p className="text-sm text-muted-foreground">
                Add items from the menu to get started
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex gap-2 sm:gap-3 rounded-xl border border-border bg-card p-2 sm:p-3"
              >
                <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-xl sm:text-2xl">🍽️</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate font-semibold text-foreground text-sm sm:text-base">{item.name}</p>
                  <p className="text-xs sm:text-sm font-medium text-primary">
                    {formatNaira(item.price)}
                  </p>
                  <div className="mt-1.5 sm:mt-2 flex items-center gap-1.5 sm:gap-2">
                    <button
                      aria-label="Decrease"
                      onClick={() => setQty(item.id, item.quantity - 1)}
                      className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-md border border-border bg-background hover:bg-muted"
                    >
                      <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </button>
                    <span className="w-5 sm:w-6 text-center text-xs sm:text-sm font-semibold">
                      {item.quantity}
                    </span>
                    <button
                      aria-label="Increase"
                      onClick={() => setQty(item.id, item.quantity + 1)}
                      className="grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-md border border-border bg-background hover:bg-muted"
                    >
                      <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </button>
                    <button
                      aria-label="Remove"
                      onClick={() => remove(item.id)}
                      className="ml-auto grid h-6 w-6 sm:h-7 sm:w-7 place-items-center rounded-md text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border pt-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="cart-name">Your Name</Label>
            <Input
              id="cart-name"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cart-address">Delivery Address / Notes</Label>
            <Textarea
              id="cart-address"
              placeholder="123 Main St, Apt 4B"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: "cash_on_delivery", label: "Cash on Delivery", Icon: Banknote },
                { value: "paystack", label: "Pay with Card", Icon: CreditCard },
              ] as const).map(({ value, label, Icon }) => {
                const active = paymentMethod === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentMethod(value)}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 p-3 text-xs font-semibold transition ${
                      active
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                );
              })}
            </div>
            {paymentMethod === "paystack" && (
              <p className="text-xs text-muted-foreground">
                Online card payments coming soon — order will be reserved.
              </p>
            )}
          </div>

          {credits > 0 && items.length > 0 && (
            <label className="flex items-start gap-2 rounded-xl border-2 border-primary/40 bg-primary/10 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useCredit}
                onChange={(e) => setUseCredit(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-primary"
              />
              <div className="flex-1 text-xs">
                <p className="font-semibold text-primary">🎁 Use a free meal credit</p>
                <p className="text-muted-foreground">
                  You have {credits} credit{credits === 1 ? "" : "s"}. Cheapest item ({formatNaira(cheapest)}) will be free.
                </p>
              </div>
            </label>
          )}

          <div className="space-y-1 pt-1">
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-muted-foreground line-through">{formatNaira(total)}</span>
              </div>
            )}
            {discount > 0 && (
              <div className="flex items-center justify-between text-sm text-primary font-medium">
                <span>Free meal discount</span>
                <span>-{formatNaira(discount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold">Total</span>
              <span className="text-lg font-bold text-primary">{formatNaira(finalTotal)}</span>
            </div>
          </div>
          <Button
            onClick={submit}
            disabled={submitting || items.length === 0}
            className="w-full h-12 text-base font-semibold"
          >
            {submitting ? "Placing order..." : "Place Order"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
