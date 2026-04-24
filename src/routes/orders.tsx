import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Receipt } from "lucide-react";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

interface Order {
  id: string;
  order_code: string | null;
  created_at: string;
  status: string;
  total: number;
  customer_name: string;
  delivery_address: string;
  items: { id: string; name: string; price: number; quantity: number }[];
}

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data as unknown as Order[]) ?? []);
        setBusy(false);
      });
  }, [user]);

  return (
    <div className="min-h-screen">
      <Header onCartClick={() => setCartOpen(true)} />
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-bold mb-1">My Orders</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Track all the meals you've ordered
        </p>

        {busy ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-card/60 border border-border" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/60 py-16 text-center">
            <span className="text-4xl">🛒</span>
            <p className="mt-3 font-semibold text-primary">No orders yet</p>
            <p className="text-sm text-muted-foreground">Place your first order from the menu</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">
                      Order {o.order_code ? <span className="font-mono">{o.order_code}</span> : `#${o.id.slice(0, 8)}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant={o.status === "delivered" ? "default" : "secondary"} className="capitalize">
                    {o.status}
                  </Badge>
                </div>
                <ul className="mt-3 space-y-1 text-sm">
                  {o.items.map((it) => (
                    <li key={it.id} className="flex justify-between">
                      <span>{it.quantity}× {it.name}</span>
                      <span className="text-muted-foreground">{formatNaira(it.price * it.quantity)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm text-muted-foreground truncate max-w-[55%]">
                    📍 {o.delivery_address}
                  </span>
                  <span className="font-bold text-primary">{formatNaira(o.total)}</span>
                </div>
                <div className="mt-3 flex justify-end">
                  <Link to="/receipt/$id" params={{ id: o.id }}>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Receipt className="h-3.5 w-3.5" /> View Receipt
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
