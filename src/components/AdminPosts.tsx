import { useEffect, useState } from "react";
import { Trash2, Upload, Edit, FileText, Image } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RichTextEditor } from "@/components/RichTextEditor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Post {
  id: string;
  image_url: string;
  caption: string | null;
  title: string | null;
  content: string | null;
  is_post: boolean;
  sort_order: number;
}

export function AdminPosts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [form, setForm] = useState({
    caption: "",
    title: "",
    content: "",
    is_post: false,
  });

  const refresh = async () => {
    const { data } = await supabase
      .from("gallery_images")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setPosts((data as Post[]) ?? []);
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
      caption: form.caption.trim() || null,
      title: form.title.trim() || null,
      content: form.content.trim() || null,
      is_post: form.is_post,
      sort_order: posts.length,
    });
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Post created successfully");
    setForm({ caption: "", title: "", content: "", is_post: false });
    e.target.value = "";
    refresh();
  };

  const openEditDialog = (post: Post) => {
    setEditingPost(post);
    setForm({
      caption: post.caption || "",
      title: post.title || "",
      content: post.content || "",
      is_post: post.is_post,
    });
    setDialogOpen(true);
  };

  const savePost = async () => {
    if (!editingPost) return;
    const { error } = await supabase
      .from("gallery_images")
      .update({
        caption: form.caption.trim() || null,
        title: form.title.trim() || null,
        content: form.content.trim() || null,
        is_post: form.is_post,
      })
      .eq("id", editingPost.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Post updated");
    setDialogOpen(false);
    setEditingPost(null);
    refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("gallery_images").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Deleted");
      refresh();
    }
  };

  return (
    <div className="space-y-4">
      {/* Create new post */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4" /> Create New Post
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Post title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Caption (short)</Label>
              <Input
                placeholder="Brief caption"
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                maxLength={120}
              />
            </div>
          </div>
          
          {/* Rich Text Editor */}
          <div className="space-y-2">
            <Label>Content</Label>
            <RichTextEditor
              content={form.content}
              onChange={(html) => setForm({ ...form, content: html })}
              placeholder="Write your post content with rich formatting..."
            />
          </div>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={form.is_post}
              onCheckedChange={(v) => setForm({ ...form, is_post: Boolean(v) })}
            />
            <span className="text-sm font-medium">Mark as announcement post</span>
          </label>
          
          <label className="block cursor-pointer rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 p-4 sm:p-6 text-center transition hover:border-primary">
            <div className="text-primary">
              <Upload className="mx-auto mb-2 h-6 w-6" />
              <p className="text-sm font-medium">
                {uploading ? "Uploading..." : "Click to upload cover image"}
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

      {/* Posts list */}
      {posts.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/60 py-12 text-center">
          <span className="text-3xl">📝</span>
          <p className="mt-2 font-semibold text-primary">No posts yet</p>
          <p className="text-sm text-muted-foreground">
            Create your first post or announcement
          </p>
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-soft)]"
            >
              <div className="relative">
                <img
                  src={post.image_url}
                  alt={post.title || post.caption || "Post"}
                  className="aspect-[4/3] w-full object-cover"
                />
                {post.is_post && (
                  <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    Announcement
                  </div>
                )}
              </div>
              <div className="p-3">
                {post.title && (
                  <h4 className="font-bold text-sm line-clamp-1">{post.title}</h4>
                )}
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                  {post.content?.replace(/<[^>]*>/g, '') || post.caption || "No content"}
                </p>
                <div className="flex items-center justify-end gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEditDialog(post)}
                    className="h-8 px-3 text-xs"
                  >
                    <Edit className="h-3 w-3 mr-1" /> Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => remove(post.id)}
                    className="text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {editingPost && (
              <img
                src={editingPost.image_url}
                alt="Post"
                className="w-full aspect-video object-cover rounded-xl"
              />
            )}
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                placeholder="Post title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label>Caption (short)</Label>
              <Input
                placeholder="Brief caption"
                value={form.caption}
                onChange={(e) => setForm({ ...form, caption: e.target.value })}
                maxLength={120}
              />
            </div>
            
            {/* Rich Text Editor in Dialog */}
            <div className="space-y-2">
              <Label>Content</Label>
              <RichTextEditor
                content={form.content}
                onChange={(html) => setForm({ ...form, content: html })}
                placeholder="Write your post content with rich formatting..."
              />
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.is_post}
                onCheckedChange={(v) => setForm({ ...form, is_post: Boolean(v) })}
              />
              <span className="text-sm font-medium">Mark as announcement post</span>
            </label>
            <Button onClick={savePost} className="w-full">
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
