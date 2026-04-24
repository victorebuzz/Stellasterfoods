import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Download, Printer } from "lucide-react";
import JsBarcode from "jsbarcode";
import jsPDF from "jspdf";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/receipt/$id")({
  component: ReceiptPage,
});

interface OrderRow {
  id: string;
  order_code: string | null;
  created_at: string;
  status: string;
  payment_method: string;
  payment_status: string;
  total: number;
  customer_name: string;
  delivery_address: string;
  free_meal_applied: boolean;
  items: { id: string; name: string; price: number; quantity: number }[];
}

function ReceiptPage() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [busy, setBusy] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setOrder((data as unknown as OrderRow) ?? null);
        setBusy(false);
      });
  }, [id, user]);

  useEffect(() => {
    if (order?.order_code && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, order.order_code, {
          format: "CODE128",
          displayValue: true,
          fontSize: 16,
          height: 70,
          margin: 8,
          background: "#ffffff",
          lineColor: "#000000",
        });
      } catch (e) {
        console.error("Barcode render failed", e);
      }
    }
  }, [order]);

  const downloadPdf = async () => {
    if (!order || !order.order_code) return;
    const doc = new jsPDF({ unit: "mm", format: "a5" });
    const pageW = doc.internal.pageSize.getWidth();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Stellaster Kitchen", pageW / 2, 18, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Order Receipt", pageW / 2, 25, { align: "center" });

    doc.setDrawColor(200);
    doc.line(12, 30, pageW - 12, 30);

    doc.setFontSize(10);
    let y = 38;
    doc.text(`Order Code: ${order.order_code}`, 12, y); y += 6;
    doc.text(`Date: ${new Date(order.created_at).toLocaleString()}`, 12, y); y += 6;
    doc.text(`Customer: ${order.customer_name}`, 12, y); y += 6;
    const addrLines = doc.splitTextToSize(`Address: ${order.delivery_address}`, pageW - 24);
    doc.text(addrLines, 12, y); y += addrLines.length * 5 + 2;
    doc.text(`Payment: ${order.payment_method.replace(/_/g, " ")} (${order.payment_status})`, 12, y); y += 6;
    doc.text(`Status: ${order.status}`, 12, y); y += 8;

    doc.setFont("helvetica", "bold");
    doc.text("Items", 12, y);
    doc.setFont("helvetica", "normal");
    y += 6;
    order.items.forEach((it) => {
      const line = `${it.quantity} x ${it.name}`;
      const amt = formatNaira(it.price * it.quantity);
      doc.text(line, 12, y);
      doc.text(amt, pageW - 12, y, { align: "right" });
      y += 5;
    });
    if (order.free_meal_applied) {
      doc.setTextColor(40, 130, 60);
      doc.text("- Free meal credit applied", 12, y);
      doc.setTextColor(0);
      y += 5;
    }

    y += 3;
    doc.line(12, y, pageW - 12, y); y += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Total", 12, y);
    doc.text(formatNaira(order.total), pageW - 12, y, { align: "right" });
    y += 10;

    if (barcodeRef.current) {
      const svg = barcodeRef.current;
      const xml = new XMLSerializer().serializeToString(svg);
      const svg64 = btoa(unescape(encodeURIComponent(xml)));
      const img64 = "data:image/svg+xml;base64," + svg64;
      const imgW = 80;
      const imgH = 28;
      doc.addImage(img64, "SVG", (pageW - imgW) / 2, y, imgW, imgH);
      y += imgH + 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Show this barcode to your delivery rider", pageW / 2, y, { align: "center" });
    }

    doc.save(`stellaster-receipt-${order.order_code}.pdf`);
  };

  return (
    <div className="min-h-screen">
      <Header onCartClick={() => setCartOpen(true)} />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <Link
          to="/orders"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to orders
        </Link>

        {busy ? (
          <div className="h-64 animate-pulse rounded-2xl bg-card/60 border border-border" />
        ) : !order ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
            <p className="font-semibold">Receipt not found</p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap gap-2 print:hidden">
              <Button onClick={downloadPdf} className="gap-2">
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button variant="outline" onClick={() => window.print()} className="gap-2">
                <Printer className="h-4 w-4" /> Print
              </Button>
            </div>

            <div
              id="receipt-printable"
              className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] print:shadow-none print:border-0"
            >
              <div className="text-center border-b border-border pb-4">
                <h1 className="text-2xl font-extrabold text-primary">Stellaster Kitchen</h1>
                <p className="text-xs text-muted-foreground">Order Receipt</p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Order Code</p>
                  <p className="font-mono font-bold">{order.order_code}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={order.status === "delivered" ? "default" : "secondary"} className="capitalize">
                    {order.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p>{new Date(order.created_at).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground">Payment</p>
                  <p className="capitalize">
                    {order.payment_method.replace(/_/g, " ")} · {order.payment_status}
                  </p>
                </div>
              </div>

              <div className="mt-4 border-t border-border pt-3 text-sm">
                <p className="font-semibold">{order.customer_name}</p>
                <p className="text-muted-foreground">📍 {order.delivery_address}</p>
              </div>

              <ul className="mt-4 space-y-1 border-t border-border pt-3 text-sm">
                {order.items.map((it) => (
                  <li key={it.id} className="flex justify-between">
                    <span>{it.quantity}× {it.name}</span>
                    <span className="text-muted-foreground">{formatNaira(it.price * it.quantity)}</span>
                  </li>
                ))}
                {order.free_meal_applied && (
                  <li className="flex justify-between text-green-600 font-medium">
                    <span>🎉 Free meal credit applied</span>
                  </li>
                )}
              </ul>

              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-lg font-bold">Total</span>
                <span className="text-lg font-bold text-primary">{formatNaira(order.total)}</span>
              </div>

              <div className="mt-6 flex flex-col items-center border-t border-border pt-5">
                <div className="rounded-xl bg-white p-3">
                  <svg ref={barcodeRef} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground text-center">
                  Show this barcode to your delivery rider
                </p>
              </div>
            </div>
          </>
        )}
      </main>
      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
