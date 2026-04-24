import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, User, LogOut, ShieldCheck, Sun, Sunset, Moon, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HeaderProps {
  onCartClick: () => void;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return { label: "Good Morning", Icon: Sun };
  if (hour < 17) return { label: "Good Afternoon", Icon: Sunset };
  return { label: "Good Evening", Icon: Moon };
}

export function Header({ onCartClick }: HeaderProps) {
  const { user, isAdmin, signOut } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setAvatarUrl(null);
      return;
    }
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => setAvatarUrl(data?.avatar_url ?? null));
  }, [user]);

  const { label, Icon } = getGreeting();
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ||
    user?.email?.split("@")[0] ||
    "Guest";

  return (
    <header className="border-b border-border/60 bg-background/70 backdrop-blur-md sticky top-0 z-30">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center gap-1.5 sm:gap-2 leading-tight">
          <Icon className="h-5 w-5 text-primary sm:h-7 sm:w-7" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-foreground sm:text-lg">
              {label},
            </span>
            <span className="text-xs font-bold text-primary sm:text-base">
              {displayName}
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onCartClick}
            aria-label="Open cart"
            className="relative grid h-10 w-10 sm:h-11 sm:w-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-soft)] transition hover:opacity-90"
          >
            <ShoppingBag className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-foreground px-1 text-[11px] font-bold text-background">
                {count}
              </span>
            )}
          </button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  aria-label="Account"
                  className="grid h-10 w-10 sm:h-11 sm:w-11 place-items-center overflow-hidden rounded-full bg-secondary text-secondary-foreground hover:bg-accent"
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 sm:w-56">
                <DropdownMenuLabel className="truncate text-sm">
                  {user.email}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
                  <User className="mr-2 h-4 w-4" />
                  My profile
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin" })}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Admin dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate({ to: "/orders" })}>
                  My orders
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/referrals" })}>
                  <Gift className="mr-2 h-4 w-4" />
                  Refer & earn
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => {
                  signOut().then(() => navigate({ to: "/splash" }));
                }}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button onClick={() => navigate({ to: "/login" })} variant="outline" size="sm" className="h-10 px-4 text-sm">
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
