import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin/login")({
  component: AdminLoginPage,
});

const schema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (isAdmin) navigate({ to: "/admin" });
      else {
        toast.error("This account is not an admin account");
        supabase.auth.signOut();
      }
    }
  }, [user, isAdmin, loading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back, admin!");
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-5 pt-16 pb-10">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center text-center">
          <Logo size={56} />
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Admin Portal
          </div>
          <h1 className="mt-3 text-3xl font-extrabold text-foreground">
            Stellaster Kitchen
          </h1>
          <p className="mt-1 text-primary font-medium">Manage menu & orders</p>
        </div>

        <form onSubmit={submit} className="mt-10 space-y-5">
          <h2 className="text-2xl font-bold">Admin Login</h2>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-primary">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@stellaster.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="h-12 bg-card"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-primary">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
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

          <Button type="submit" disabled={submitting} className="w-full h-12 text-base font-semibold">
            {submitting ? "Signing in..." : "Login as Admin"}
          </Button>

          <p className="text-center text-sm text-primary">
            Need an admin account?{" "}
            <Link to="/admin/signup" className="font-bold text-foreground hover:underline">
              Sign up
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground">
            Customer?{" "}
            <Link to="/login" className="hover:underline">Go to customer login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}
