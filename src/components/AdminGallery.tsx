import { useEffect, useState } from "react";
import { Trash2, Upload, GripVertical } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface GalleryImage {
  id: string;
  image_url: string;
  caption: string | null;
  sort_order: number;
}

export function AdminGallery() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const refresh = async () => {
    const { data } = await supabase
      .from("gallery_images")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setImages((data as GalleryImage[]) ?? []);
  };

  useEffect(() => {
    refresh();
  }, []);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("gallery-images")
      .upload(path, file, { upsert: false });
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const { data: pub } = supabase.storage.from("gallery-images").getPublicUrl(path);
    const { error } = await supabase.from("gallery_images").insert({
      image_url: pub.publicUrl,
      caption: caption.trim() || null,
      sort_order: images.length,
    });
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Image added to gallery");
    setCaption("");
    e.target.value = "";
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this image from the gallery?")) return;
    const { error } = await supabase.from("gallery_images").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removed");
      refresh();
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-semibold mb-3">Add Gallery Image</h3>
        <div className="space-y-3">
          <Input
            placeholder="Optional caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            maxLength={120}
          />
          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-6 text-center transition hover:border-primary">
            <div className="text-primary">
              <Upload className="mx-auto mb-2 h-6 w-6" />
              <p className="text-sm font-medium">
                {uploading ? "Uploading..." : "Click to upload image"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG or PNG, up to 5MB
              </p>
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={onUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/60 py-12 text-center">
          <span className="text-3xl">🖼️</span>
          <p className="mt-2 font-semibold text-primary">No gallery images yet</p>
          <p className="text-sm text-muted-foreground">
            Upload photos to feature them on the home page
          </p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <div
              key={img.id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]"
            >
              <img
                src={img.image_url}
                alt={img.caption ?? "Gallery"}
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="flex items-center justify-between p-2 sm:p-3">
                <p className="truncate text-xs sm:text-sm text-muted-foreground">
                  {img.caption || "No caption"}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => remove(img.id)}
                  className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                >
                  <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
