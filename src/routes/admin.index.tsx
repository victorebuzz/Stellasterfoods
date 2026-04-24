import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus, Pencil, Trash2, X, Upload } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatNaira } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FoodItem } from "@/components/FoodCard";
import { AdminPosts } from "@/components/AdminPosts";
import { AdminScanner } from "@/components/AdminScanner";

export const Route = createFileRoute("/admin/")({
  component: AdminPage,
});

interface AdminOrder {
  id: string;
  order_code: string | null;
  created_at: string;
  status: string;
  total: number;
  customer_name: string;
  delivery_address: string;
  items: { id: string; name: string; price: number; quantity: number }[];
}

const itemSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  description: z.string().trim().max(500).optional(),
  price: z.number().min(0, "Price must be ≥ 0").max(1_000_000),
  category: z.string().trim().min(1, "Category required").max(50),
});

function AdminPage() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FoodItem | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) navigate({ to: "/admin/login" });
      else if (!isAdmin) navigate({ to: "/admin/login" });
    }
  }, [user, isAdmin, loading, navigate]);

  const refresh = async () => {
    const [{ data: foodData }, { data: orderData }] = await Promise.all([
      supabase.from("food_items").select("*").order("created_at", { ascending: false }),
      supabase.from("orders").select("*").order("created_at", { ascending: false }),
    ]);
    setItems((foodData as FoodItem[]) ?? []);
    setOrders((orderData as unknown as AdminOrder[]) ?? []);
  };

  useEffect(() => {
    if (isAdmin) refresh();
  }, [isAdmin]);

  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("food_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      refresh();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Order updated");
      refresh();
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header onCartClick={() => setCartOpen(true)} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Manage your menu and orders
            </p>
          </div>
        </div>

        <Tabs defaultValue="menu">
          <TabsList className="w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden justify-start sm:justify-center">
            <TabsTrigger value="menu" className="text-xs sm:text-sm whitespace-nowrap">Menu Management</TabsTrigger>
            <TabsTrigger value="posts" className="text-xs sm:text-sm whitespace-nowrap">Posts</TabsTrigger>
            <TabsTrigger value="scan" className="text-xs sm:text-sm whitespace-nowrap">Scan Receipt</TabsTrigger>
            <TabsTrigger value="orders" className="text-xs sm:text-sm whitespace-nowrap">
              Orders {orders.length > 0 && <Badge variant="secondary" className="ml-1 sm:ml-2">{orders.length}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu" className="mt-6">
            <div className="flex justify-end mb-4">
              <Button
                onClick={() => {
                  setEditing(null);
                  setDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Food Item
              </Button>
            </div>

            {items.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/60 py-16 text-center">
                <span className="text-4xl">🍽️</span>
                <p className="mt-3 font-semibold text-primary">No food items yet</p>
                <p className="text-sm text-muted-foreground">
                  Click "Add Food Item" to start building your menu
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]"
                  >
                    <div className="aspect-[4/3] bg-muted">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full w-full place-items-center text-4xl">🍽️</div>
                      )}
                    </div>
                    <div className="p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm sm:text-base">{item.name}</h3>
                        <Badge variant={item.is_available ? "default" : "secondary"} className="text-[10px]">
                          {item.is_available ? "Live" : "Hidden"}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs sm:text-sm text-muted-foreground">
                        {item.description}
                      </p>
                      <p className="mt-2 font-bold text-sm sm:text-base text-primary">{formatNaira(item.price)}</p>
                      <div className="mt-2 sm:mt-3 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                          onClick={() => {
                            setEditing(item);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="mr-1 h-3 w-3 sm:h-3.5 sm:w-3.5" /> Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => remove(item.id)}
                          className="text-destructive hover:bg-destructive/10 h-8 sm:h-9 w-8 sm:w-9 p-0"
                        >
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="posts" className="mt-6">
            <AdminPosts />
          </TabsContent>

          <TabsContent value="scan" className="mt-6">
            <div className="mx-auto max-w-md">
              <h2 className="text-lg font-bold mb-1">Confirm delivery</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Scan the customer's receipt barcode or enter the order code to mark it delivered.
              </p>
              <AdminScanner />
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            {orders.length === 0 ? (
              <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/60 py-16 text-center">
                <span className="text-4xl">📋</span>
                <p className="mt-3 font-semibold text-primary">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map((o) => (
                  <div key={o.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold">{o.customer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {o.order_code ? <span className="font-mono">{o.order_code}</span> : `#${o.id.slice(0, 8)}`} · {new Date(o.created_at).toLocaleString()}
                        </p>
                        <p className="text-sm mt-1">📍 {o.delivery_address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={o.status}
                          onValueChange={(v) => updateStatus(o.id, v)}
                        >
                          <SelectTrigger className="w-36">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="preparing">Preparing</SelectItem>
                            <SelectItem value="out_for_delivery">Out for delivery</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <ul className="mt-3 space-y-1 text-sm border-t border-border pt-3">
                      {o.items.map((it) => (
                        <li key={it.id} className="flex justify-between">
                          <span>{it.quantity}× {it.name}</span>
                          <span className="text-muted-foreground">{formatNaira(it.price * it.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 flex justify-end font-bold text-primary">
                      {formatNaira(o.total)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <FoodItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        item={editing}
        onSaved={() => {
          setDialogOpen(false);
          refresh();
        }}
      />

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}

function FoodItemDialog({
  open,
  onOpenChange,
  item,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  item: FoodItem | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [available, setAvailable] = useState(true);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "");
      setDescription(item?.description ?? "");
      setPrice(item ? String(item.price) : "");
      setCategory(item?.category ?? "");
      setAvailable(item?.is_available ?? true);
      setImageUrl(item?.image_url ?? null);
      setImageFile(null);
    }
  }, [open, item]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
  };

  const submit = async () => {
    const parsed = itemSchema.safeParse({
      name,
      description: description || undefined,
      price: Number(price),
      category,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    let finalImageUrl = item?.image_url ?? null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("food-images")
        .upload(path, imageFile, { upsert: false });
      if (upErr) {
        setBusy(false);
        toast.error(upErr.message);
        return;
      }
      const { data: pub } = supabase.storage.from("food-images").getPublicUrl(path);
      finalImageUrl = pub.publicUrl;
    }

    const payload = {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      price: parsed.data.price,
      category: parsed.data.category,
      is_available: available,
      image_url: finalImageUrl,
    };

    const { error } = item
      ? await supabase.from("food_items").update(payload).eq("id", item.id)
      : await supabase.from("food_items").insert(payload);

    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(item ? "Item updated" : "Item added to menu");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Food Item" : "Add Food Item"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Food Image</Label>
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center transition hover:border-primary">
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="mx-auto max-h-40 rounded-lg object-cover" />
              ) : (
                <div className="text-primary">
                  <Upload className="mx-auto mb-2 h-6 w-6" />
                  <p className="text-sm">Click to upload image</p>
                </div>
              )}
              <input type="file" accept="image/*" onChange={onFile} className="hidden" />
            </label>
            {imageUrl && (
              <button
                type="button"
                onClick={() => {
                  setImageUrl(null);
                  setImageFile(null);
                }}
                className="text-xs text-destructive flex items-center gap-1"
              >
                <X className="h-3 w-3" /> Remove image
              </button>
            )}
            <p className="text-xs text-muted-foreground">
              Recommended: square images (JPG, PNG)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="f-name">Food Name</Label>
            <Input id="f-name" placeholder="Margherita Pizza" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="f-desc">Description</Label>
            <Textarea id="f-desc" placeholder="Classic Italian pizza with fresh basil..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="f-price">Price (₦)</Label>
              <Input id="f-price" type="number" placeholder="3500" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="f-cat">Category</Label>
              <Input id="f-cat" placeholder="Pizza" value={category} onChange={(e) => setCategory(e.target.value)} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={available} onCheckedChange={(v) => setAvailable(Boolean(v))} />
            <span className="text-sm font-medium">Available for ordering</span>
          </label>
          <Button onClick={submit} disabled={busy} className="w-full h-12 font-semibold">
            {busy ? "Saving..." : item ? "Save Changes" : "Add to Menu"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
