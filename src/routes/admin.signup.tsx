import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, MailCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/signup")({
  component: AdminSignupPage,
});

const schema = z.object({
  full_name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
  phone: z.string().trim().min(7, "Phone required").max(20),
});

function AdminSignupPage() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user && isAdmin) navigate({ to: "/admin" });
  }, [user, isAdmin, loading, navigate]);

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
    const redirectUrl = `${window.location.origin}/admin/login`;
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
          is_admin_signup: "true",
        },
      },
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSubmittedEmail(parsed.data.email);
    toast.success("Check your email to confirm your admin account", {
      description: "We've sent a confirmation link to " + parsed.data.email,
      duration: 8000,
    });
  };

  if (submittedEmail) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-foreground">Confirm your admin email</h1>
          <p className="mt-3 text-muted-foreground">
            We've sent a confirmation link to{" "}
            <span className="font-semibold text-foreground">{submittedEmail}</span>.
            Click the link in your inbox, then come back to log in as admin.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Didn't get it? Check your spam folder.</p>
          <div className="mt-8 space-y-3">
            <Link to="/admin/login">
              <Button className="w-full h-12 font-semibold">Go to Admin Login</Button>
            </Link>
            <button
              onClick={() => setSubmittedEmail(null)}
              className="text-sm text-primary hover:underline"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center px-5 py-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo size={48} />
          <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin Portal
          </div>
          <h1 className="mt-3 text-2xl font-extrabold text-foreground">Stellaster Kitchen</h1>
          <p className="mt-1 text-primary font-medium text-sm">Create an admin account</p>
        </div>

        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
          📧 You'll need to confirm your email after signing up before you can log in.
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <h2 className="text-2xl font-bold">Create Admin Account</h2>

          <div className="space-y-2">
            <Label htmlFor="name" className="text-primary">Full Name</Label>
            <Input id="name" placeholder="Jane Admin" value={form.full_name} onChange={update("full_name")} className="h-12 bg-card" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-primary">Email</Label>
            <Input id="email" type="email" placeholder="admin@stellaster.com" value={form.email} onChange={update("email")} autoComplete="email" className="h-12 bg-card" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-primary">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={form.password}
                onChange={update("password")}
                autoComplete="new-password"
                className="h-12 bg-card pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPwd((s) => !s)}
                aria-label={showPwd ? "Hide password" : "Show password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-primary"
              >
                {showPwd ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-primary">Phone Number</Label>
            <Input id="phone" type="tel" placeholder="+234 123 456 7890" value={form.phone} onChange={update("phone")} className="h-12 bg-card" />
          </div>

          <Button type="submit" disabled={submitting} className="w-full h-12 text-base font-semibold">
            {submitting ? "Creating..." : "Create Admin Account"}
          </Button>

          <p className="text-center text-sm text-primary">
            Already an admin?{" "}
            <Link to="/admin/login" className="font-bold text-foreground hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
