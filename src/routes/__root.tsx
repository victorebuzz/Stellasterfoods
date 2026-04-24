import { Outlet, Link, createRootRoute, HeadContent, Scripts, useNavigate, useLocation } from "@tanstack/react-router";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CartProvider } from "@/hooks/useCart";
import { Toaster } from "@/components/ui/sonner";
import { useEffect } from "react";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Stellaster Kitchen — Order delicious meals anytime" },
      {
        name: "description",
        content:
          "Stellaster Kitchen — fresh, delicious meals delivered to your door. Browse the menu and place your order in seconds.",
      },
      { property: "og:title", content: "Stellaster Kitchen — Order delicious meals anytime" },
      {
        property: "og:description",
        content: "Delicious food delivered to your door.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: "Stellaster Kitchen — Order delicious meals anytime" },
      { name: "description", content: "The premium local dish for your everyday joy" },
      { property: "og:description", content: "The premium local dish for your everyday joy" },
      { name: "twitter:description", content: "The premium local dish for your everyday joy" },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/ss8LHTBRZ5RwTKIEZ0DIeRTulSo2/social-images/social-1776912151472-Stellaster_Logo_Transparent.webp" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/ss8LHTBRZ5RwTKIEZ0DIeRTulSo2/social-images/social-1776912151472-Stellaster_Logo_Transparent.webp" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.ico" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

// Splash redirect wrapper - instant redirect, no loading state
function SplashRedirect({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    const isPublicPath = ["/splash", "/login", "/signup", "/admin/login", "/admin/signup"].includes(location.pathname);

    if (!user && !isPublicPath) {
      navigate({ to: "/splash" });
      return;
    }

    if (user && location.pathname === "/splash") {
      navigate({ to: "/" });
    }
  }, [user, loading, location.pathname, navigate]);

  return <>{children}</>;
}

function RootComponent() {
  return (
    <AuthProvider>
      <CartProvider>
        <SplashRedirect>
          <Outlet />
        </SplashRedirect>
        <Toaster richColors position="top-center" />
      </CartProvider>
    </AuthProvider>
  );
}
