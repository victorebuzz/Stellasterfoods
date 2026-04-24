import { useEffect, useRef, useState } from "react";
import { Camera, CheckCircle2, ScanLine, X } from "lucide-react";
import { toast } from "sonner";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/format";

interface Result {
  success: boolean;
  message?: string;
  customer_name?: string;
  total?: number;
  order_id?: string;
}

export function AdminScanner() {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = "admin-scanner-region";

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch {
        /* noop */
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = async () => {
    setResult(null);
    setScanning(true);
    // Wait a tick so the container is in the DOM
    await new Promise((r) => setTimeout(r, 50));
    try {
      const scanner = new Html5Qrcode(containerId);
      scannerRef.current = scanner;
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 260, height: 120 } },
        async (decoded) => {
          await stopScanner();
          await submit(decoded.trim().toUpperCase());
        },
        () => {
          /* ignore frame errors */
        }
      );
    } catch (e: any) {
      setScanning(false);
      toast.error("Could not start camera: " + (e?.message ?? "permission denied"));
    }
  };

  const submit = async (codeOverride?: string) => {
    const value = (codeOverride ?? code).trim().toUpperCase();
    if (!value) {
      toast.error("Enter or scan an order code");
      return;
    }
    setBusy(true);
    setResult(null);
    const { data, error } = await supabase.rpc("mark_order_delivered", {
      _order_code: value,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const r = data as unknown as Result;
    setResult(r);
    if (r?.success) {
      toast.success(`Delivered to ${r.customer_name}`);
      setCode("");
    } else {
      toast.error(r?.message ?? "Could not mark order");
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <div className="flex items-center gap-2 mb-3">
          <ScanLine className="h-5 w-5 text-primary" />
          <h2 className="font-bold">Camera Scanner</h2>
        </div>
        {!scanning ? (
          <Button onClick={startScanner} className="w-full gap-2">
            <Camera className="h-4 w-4" /> Start Camera
          </Button>
        ) : (
          <div className="space-y-3">
            <div
              id={containerId}
              className="overflow-hidden rounded-xl border border-border bg-black"
              style={{ minHeight: 240 }}
            />
            <Button variant="outline" onClick={stopScanner} className="w-full gap-2">
              <X className="h-4 w-4" /> Stop Camera
            </Button>
          </div>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Point the camera at the barcode under the customer's receipt.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
        <Label htmlFor="manual-code" className="mb-2 block font-semibold">
          Or enter order code manually
        </Label>
        <div className="flex gap-2">
          <Input
            id="manual-code"
            placeholder="e.g. A7B2K9XQ"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="font-mono"
            maxLength={20}
          />
          <Button onClick={() => submit()} disabled={busy}>
            {busy ? "Checking..." : "Confirm"}
          </Button>
        </div>
      </div>

      {result?.success && (
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-primary shrink-0" />
            <div>
              <p className="font-bold text-primary">Delivery confirmed</p>
              <p className="text-sm">{result.customer_name}</p>
              {typeof result.total === "number" && (
                <p className="text-sm text-muted-foreground">
                  Total: {formatNaira(result.total)}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
