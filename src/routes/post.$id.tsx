import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Calendar } from "lucide-react";
import { Header } from "@/components/Header";
import { CartDrawer } from "@/components/CartDrawer";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/post/$id")({
  component: PostPage,
});

interface Post {
  id: string;
  image_url: string;
  caption: string | null;
  title: string | null;
  content: string | null;
  is_post: boolean;
  created_at: string;
}

function PostPage() {
  const { id } = Route.useParams();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    supabase
      .from("gallery_images")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        setPost((data as Post) ?? null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen">
        <Header onCartClick={() => setCartOpen(true)} />
        <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
          <div className="text-center py-16">
            <span className="text-4xl">📝</span>
            <p className="mt-3 font-semibold text-primary">Post not found</p>
            <Link to="/">
              <Button variant="outline" className="mt-4">Go Home</Button>
            </Link>
          </div>
        </main>
        <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header onCartClick={() => setCartOpen(true)} />
      
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" /> Back to menu
        </Link>

        <article className="rounded-2xl border border-border bg-card overflow-hidden shadow-[var(--shadow-soft)]">
          {/* Hero image */}
          <img
            src={post.image_url}
            alt={post.title || post.caption || "Post"}
            className="w-full aspect-video sm:aspect-[16/9] object-cover"
          />

          <div className="p-4 sm:p-6">
            {/* Title */}
            <h1 className="text-xl sm:text-2xl font-bold">
              {post.title || "Untitled Post"}
            </h1>

            {/* Meta */}
            <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{new Date(post.created_at).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}</span>
              {post.is_post && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                  Announcement
                </span>
              )}
            </div>

            {/* Caption/Summary */}
            {post.caption && (
              <p className="mt-4 text-sm sm:text-base font-medium text-muted-foreground italic">
                {post.caption}
              </p>
            )}

            {/* Content */}
            {post.content && (
              <div className="mt-4 sm:mt-6 prose prose-sm sm:prose max-w-none">
                {post.content.split("\n").map((paragraph, i) => (
                  <p key={i} className="mb-4 text-sm sm:text-base leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {/* Fallback if no content */}
            {!post.content && !post.caption && (
              <p className="mt-4 text-muted-foreground text-sm">
                No additional content for this post.
              </p>
            )}
          </div>
        </article>
      </main>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
    </div>
  );
}
