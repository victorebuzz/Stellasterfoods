import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Copy, Gift, Share2, Users } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/referrals")({
  component: ReferralsPage,
});

interface Stats {
  qualified: number;
  pending: number;
  credits: number;
  code: string | null;
}

function ReferralsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [cartOpen, setCartOpen] = useState(false);
  const [stats, setStats] = useState<Stats>({ qualified: 0, pending: 0, credits: 0, code: null });
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: profile }, { data: refs }] = await Promise.all([
        supabase.from("profiles").select("referral_code,free_meal_credits").eq("id", user.id).maybeSingle(),
        supabase.from("referrals").select("status").eq("referrer_id", user.id),
      ]);
      const qualified = refs?.filter((r) => r.status === "qualified").length ?? 0;
      const pending = refs?.filter((r) => r.status === "pending").length ?? 0;
      setStats({
        qualified,
        pending,
        credits: profile?.free_meal_credits ?? 0,
        code: profile?.referral_code ?? null,
      });
      setBusy(false);
    })();
  }, [user]);

  const link = stats.code ? `${typeof window !== "undefined" ? window.location.origin : ""}/signup?ref=${stats.code}` : "";
  const remaining = 5 - (stats.qualified % 5);
  const progressPct = ((stats.qualified % 5) / 5) * 100;

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  const share = async () => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Stellaster Kitchen",
          text: `Use my referral code ${stats.code} to join Stellaster Kitchen and get 50% off your first order!`,
          url: link,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      copy(link, "Referral link");
    }
  };

  return (
    <div className="min-h-screen">
      <Header onCartClick={() => setCartOpen(true)} />
      <main className="mx-auto max-w-xl px-4 py-8 sm:px-6">
        <Link to="/" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to menu
        </Link>

        <h1 className="text-2xl font-bold">Refer & Earn</h1>
        <p className="text-sm text-muted-foreground">
          Invite 5 friends — when they place their first order, you get 1 free meal 🎉
        </p>

        {busy ? (
          <div className="mt-6 h-48 animate-pulse rounded-2xl bg-card/60 border border-border" />
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Your referral code</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="font-mono text-2xl font-extrabold text-primary tracking-widest">
                  {stats.code ?? "—"}
                </span>
                {stats.code && (
                  <Button size="sm" variant="outline" onClick={() => copy(stats.code!, "Code")} className="gap-1">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                )}
              </div>
              {link && (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    readOnly
                    value={link}
                    className="flex-1 truncate rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                  />
                  <Button size="sm" onClick={share} className="gap-1">
                    <Share2 className="h-3.5 w-3.5" /> Share
                  </Button>
                </div>
              )}
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <Stat label="Qualified" value={stats.qualified} icon={<Users className="h-4 w-4" />} />
              <Stat label="Pending" value={stats.pending} icon={<Users className="h-4 w-4" />} />
              <Stat label="Free Meals" value={stats.credits} icon={<Gift className="h-4 w-4" />} highlight />
            </div>

            <div className="mt-4 rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Next free meal</span>
                <span className="text-muted-foreground">
                  {remaining} more friend{remaining === 1 ? "" : "s"} to go
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {stats.qualified % 5} / 5 qualified referrals in this cycle
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4 text-sm text-primary">
              <p className="font-semibold mb-1">How it works</p>
              <ol className="list-decimal pl-5 space-y-0.5 text-foreground/80">
                <li>Share your code or link with friends.</li>
                <li>They sign up using your code.</li>
                <li>Once their first order is delivered, they count toward your 5.</li>
                <li>Every 5 qualified friends = 1 free meal auto-applied at your next checkout.</li>
              </ol>
            </div>
          </>
        )}
      </main>
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
  highlight,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 text-center ${
        highlight ? "border-primary/40 bg-primary/10" : "border-border bg-card"
      }`}
    >
      <div className={`mx-auto mb-1 grid h-7 w-7 place-items-center rounded-full ${highlight ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
        {icon}
      </div>
      <p className="text-2xl font-extrabold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
