import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Header } from "@/components/Header";
import { Gallery } from "@/components/Gallery";
import { CartDrawer } from "@/components/CartDrawer";
import { FoodCard, type FoodItem } from "@/components/FoodCard";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const [items, setItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { add } = useCart();

  // Redirect to splash if not seen
  useEffect(() => {
    const hasSeenSplash = localStorage.getItem("stellaster_splash_seen");
    if (!hasSeenSplash) {
      navigate({ to: "/splash" });
    }
  }, [navigate]);

  useEffect(() => {
    // Parallel fetch for faster loading
    Promise.all([
      supabase
        .from("food_items")
        .select("*")
        .eq("is_available", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("gallery_images")
        .select("id,image_url,caption")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
    ]).then(([foodRes, galleryRes]) => {
      if (foodRes.error) toast.error(foodRes.error.message);
      else setItems((foodRes.data as FoodItem[]) ?? []);
      setLoading(false);
    });
  }, []);

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category));
    return ["All", ...Array.from(set)];
  }, [items]);

  // Filter items by search query
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const handleAdd = (item: FoodItem) => {
    add({ id: item.id, name: item.name, price: item.price, image_url: item.image_url });
    toast.success(`${item.name} added`);
  };

  return (
    <div className="min-h-screen">
      <Header onCartClick={() => setCartOpen(true)} />

      <Gallery />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold">Our Menu</h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Fresh meals, made with love
            </p>
          </div>
          {/* Search box */}
          <div className="relative w-full sm:w-64 lg:w-80 shrink-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              placeholder="Search menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 sm:h-11 pl-14 pr-4 text-sm rounded-full sm:rounded-xl border border-border bg-card placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-[4/3] sm:aspect-auto sm:h-72 animate-pulse rounded-2xl bg-card/60 border border-border"
              />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/60 py-16 sm:py-20 text-center">
            <span className="text-4xl">🔍</span>
            <p className="mt-3 font-semibold text-primary">No items found</p>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? `No results for "${searchQuery}"` : "Try a different search"}
            </p>
          </div>
        ) : (
          <Tabs defaultValue="All" className="w-full">
            <TabsList className="bg-transparent p-0 h-auto border-b border-border w-full justify-start rounded-none gap-3 sm:gap-4 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {categories.map((cat) => (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none px-1 pb-2 sm:pb-3 text-xs sm:text-sm whitespace-nowrap"
                >
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
            {categories.map((cat) => {
              let categoryItems = cat === "All" ? filteredItems : filteredItems.filter((i) => i.category === cat);
              // Apply search filter
              if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                categoryItems = categoryItems.filter(
                  (item) =>
                    item.name.toLowerCase().includes(query) ||
                    item.description?.toLowerCase().includes(query)
                );
              }
              if (categoryItems.length === 0) return null;
              return (
                <TabsContent key={cat} value={cat} className="mt-4 sm:mt-6">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    {categoryItems.map((item) => (
                      <FoodCard key={item.id} item={item} onAdd={handleAdd} />
                    ))}
                  </div>
                </TabsContent>
              );
            })}
          </Tabs>
        )}
      </main>

      <footer className="mt-12 border-t border-border/60 py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Stellaster Kitchen — Made with love
      </footer>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
