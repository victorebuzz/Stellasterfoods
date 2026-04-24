import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, MailCheck, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

const schema = z.object({
  full_name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  phone: z.string().trim().min(7, "Phone required").max(20),
  referral_code: z.string().trim().max(12).optional().or(z.literal("")),
});

function SignupPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "", referral_code: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref) setForm((f) => ({ ...f, referral_code: ref.toUpperCase() }));
  }, []);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/" });
  }, [user, loading, navigate]);

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
          referral_code: parsed.data.referral_code?.toUpperCase() || undefined,
        },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubmittedEmail(parsed.data.email);
    setShowConfirmModal(true);
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 py-8 sm:px-5 sm:py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo size={140} />
          <h1 className="mt-3 text-xl sm:text-2xl font-extrabold text-foreground">
            Stellaster Kitchen
          </h1>
          <p className="mt-1 text-primary font-medium text-xs sm:text-sm">
            Order delicious meals anytime
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold">Create Account</h2>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="name" className="text-primary text-xs sm:text-sm">Full Name</Label>
            <Input id="name" placeholder="John Doe" value={form.full_name} onChange={update("full_name")} className="h-10 sm:h-12 bg-card text-sm" />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="email" className="text-primary text-xs sm:text-sm">Email</Label>
            <Input id="email" type="email" placeholder="your@email.com" value={form.email} onChange={update("email")} autoComplete="email" className="h-10 sm:h-12 bg-card text-sm" />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="password" className="text-primary text-xs sm:text-sm">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={update("password")}
                autoComplete="new-password"
                className="h-10 sm:h-12 bg-card pr-12 text-sm"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"
              >
                {showPwd ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="phone" className="text-primary text-xs sm:text-sm">Phone Number</Label>
            <Input id="phone" type="tel" placeholder="+234 123 456 7890" value={form.phone} onChange={update("phone")} className="h-10 sm:h-12 bg-card text-sm" />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label htmlFor="ref" className="text-primary text-xs sm:text-sm">Referral Code (optional)</Label>
            <Input
              id="ref"
              placeholder="e.g. AB12CD"
              value={form.referral_code}
              onChange={(e) => setForm({ ...form, referral_code: e.target.value.toUpperCase() })}
              maxLength={12}
              className="h-10 sm:h-12 bg-card font-mono uppercase tracking-widest text-sm"
            />
            <p className="text-xs text-muted-foreground">Got a code from a friend? Enter it here.</p>
          </div>

          <Button type="submit" disabled={submitting} className="w-full h-10 sm:h-12 text-sm sm:text-base font-semibold">
            {submitting ? "Creating..." : "Sign Up"}
          </Button>

          <p className="text-center text-xs sm:text-sm text-primary">
            Already have an account?{" "}
            <Link to="/login" className="font-bold text-foreground hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>

      {/* Email Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-5 sm:p-6 animate-in fade-in zoom-in duration-300">
            {/* Close button */}
            <button
              onClick={() => setShowConfirmModal(false)}
              className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>

            {/* Icon */}
            <div className="mx-auto mb-4 grid h-14 w-14 sm:h-16 sm:w-16 place-items-center rounded-full bg-primary/10 text-primary">
              <MailCheck className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>

            {/* Title */}
            <h2 className="text-lg sm:text-xl font-bold text-center text-foreground">
              Confirm Your Email
            </h2>

            {/* Description */}
            <p className="mt-3 text-sm text-center text-muted-foreground leading-relaxed">
              We've sent a confirmation link to
            </p>
            <p className="text-sm text-center font-semibold text-foreground break-all">
              {submittedEmail}
            </p>
            <p className="mt-2 text-sm text-center text-muted-foreground">
              Click the link in your inbox to activate your account.
            </p>

            {/* Tip */}
            <div className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-center text-muted-foreground">
              💡 Didn't receive it? Check your spam folder
            </div>

            {/* Actions */}
            <div className="mt-5 space-y-2.5">
              <Link to="/login" className="block">
                <Button className="w-full h-11 sm:h-12 font-semibold">
                  Go to Login
                </Button>
              </Link>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="w-full text-xs sm:text-sm text-primary hover:underline py-2"
              >
                Use a different email
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
