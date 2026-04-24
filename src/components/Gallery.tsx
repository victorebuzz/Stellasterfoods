import { useEffect, useState, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  title: string | null;
  is_post: boolean;
}

export function Gallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    supabase
      .from("gallery_images")
      .select("id,image_url,caption,title,is_post")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .then(({ data }) => setImages((data as GalleryImage[]) ?? []));
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const scrollLeft = scrollRef.current.scrollLeft;
    const itemWidth = scrollRef.current.offsetWidth;
    const newIndex = Math.round(scrollLeft / itemWidth);
    setCurrentIndex(Math.min(newIndex, images.length - 1));
  };

  const scrollToImage = (index: number) => {
    if (!scrollRef.current) return;
    const itemWidth = scrollRef.current.offsetWidth;
    scrollRef.current.scrollTo({
      left: itemWidth * index,
      behavior: "smooth",
    });
    setCurrentIndex(index);
  };

  if (images.length === 0) return null;

  return (
    <section aria-label="Gallery" className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <h2 className="mb-3 text-lg font-bold text-foreground">Stellaster Gallery</h2>

      <div className="relative">
        <ul
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {images.map((img) => {
            const altText = img.title ?? img.caption ?? "Gallery image";
            return (
              <li
                key={img.id}
                className="snap-start shrink-0 w-full overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]"
              >
                <Link to="/post/$id" params={{ id: img.id }} className="block">
                  <div className="relative aspect-[16/9] sm:aspect-video">
                    <img
                      src={img.image_url}
                      alt={altText}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                    {img.is_post && (
                      <div className="absolute top-2 left-2 rounded-full bg-primary/90 px-2 py-1 text-[10px] font-semibold text-primary-foreground backdrop-blur-sm sm:text-xs">
                        Announcement
                      </div>
                    )}
                  </div>
                  <div className="p-3 sm:p-4">
                    {img.title && (
                      <h3 className="line-clamp-1 font-bold text-sm sm:text-base">{img.title}</h3>
                    )}
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground sm:text-sm">
                      {img.caption || "View details"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {images.length > 1 && (
        <div className="mt-3 flex justify-center gap-2">
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToImage(index)}
              className={`h-2 rounded-full transition-all ${
                index === currentIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
