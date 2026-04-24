import { Plus } from "lucide-react";
import { formatNaira } from "@/lib/format";
import { Button } from "@/components/ui/button";

export interface FoodItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
  image_url: string | null;
  is_available: boolean;
}

export function FoodCard({
  item,
  onAdd,
}: {
  item: FoodItem;
  onAdd: (item: FoodItem) => void;
}) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
      {/* Image section */}
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-4xl sm:text-5xl bg-gradient-to-br from-muted to-muted/50">
            🍽️
          </div>
        )}
        {/* Category badge - overlaid on image */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
          <span className="px-2 py-1 rounded-full text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide bg-background/90 backdrop-blur-sm text-foreground shadow-sm">
            {item.category}
          </span>
        </div>
        {/* Availability indicator */}
        {!item.is_available && (
          <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] flex items-center justify-center">
            <span className="px-3 py-1.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground">
              Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Content section */}
      <div className="flex flex-1 flex-col p-3 sm:p-4">
        <h3 className="font-bold text-sm sm:text-base text-foreground leading-tight line-clamp-1">
          {item.name}
        </h3>
        
        {item.description && (
          <p className="mt-1 line-clamp-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {item.description}
          </p>
        )}

        <div className="mt-auto pt-2 sm:pt-3 flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-sm sm:text-base font-bold text-primary leading-none">
              {formatNaira(item.price)}
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => onAdd(item)}
            disabled={!item.is_available}
            className="h-8 px-3 rounded-full text-xs font-semibold shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="mr-1 h-3 w-3" />
            Add
          </Button>
        </div>
      </div>
    </article>
  );
}
