import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ChefHat, Pizza, Cookie, Coffee, IceCreamBowl } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

const foodIcons = [ChefHat, Pizza, Cookie, Coffee, IceCreamBowl];

export function SplashScreen() {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleGetStarted = () => {
    localStorage.setItem("stellaster_splash_seen", "true");
    navigate({ to: "/login" });
  };

  const handleGuest = () => {
    localStorage.setItem("stellaster_splash_seen", "true");
    navigate({ to: "/" });
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-primary/5 overflow-hidden p-4">
      {/* Animated floating food icons - fewer on mobile */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {foodIcons.slice(0, 3).map((Icon, i) => (
          <div
            key={i}
            className="absolute animate-float hidden sm:block"
            style={{
              top: `${12 + (i * 20)}%`,
              left: `${8 + (i * 18)}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${3.5 + (i * 0.5)}s`,
            }}
          >
            <Icon className="text-primary/15 h-10 w-10 sm:h-12 sm:w-12" />
          </div>
        ))}
        {/* Mirror icons on right side */}
        {foodIcons.slice(0, 3).map((Icon, i) => (
          <div
            key={`right-${i}`}
            className="absolute animate-float-reverse hidden sm:block"
            style={{
              top: `${18 + (i * 18)}%`,
              right: `${10 + (i * 16)}%`,
              animationDelay: `${i * 0.5 + 0.3}s`,
              animationDuration: `${4 + (i * 0.4)}s`,
            }}
          >
            <Icon className="text-primary/12 h-8 w-8 sm:h-10 sm:w-10" />
          </div>
        ))}
      </div>

      {/* Main content */}
      <div className={`relative z-10 flex flex-col items-center text-center px-4 sm:px-6 max-w-md w-full transition-all duration-700 ${visible ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
        {/* Animated logo - very big */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping opacity-20">
            <Logo size={140} />
          </div>
          <div className="relative animate-bounce-slow">
            <Logo size={140} />
          </div>
        </div>

        {/* Brand name with gradient */}
        <h1 className="mt-5 sm:mt-6 text-2xl sm:text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent whitespace-nowrap">
          Stellaster Kitchen
        </h1>
        
        <p className="mt-2 text-sm sm:text-base md:text-lg text-muted-foreground font-medium">
          Delicious meals, delivered to your door
        </p>

        {/* Animated tagline */}
        <div className="mt-3 sm:mt-4 flex items-center gap-2 text-xs sm:text-sm text-primary/80">
          <span className="animate-pulse">✦</span>
          <span>Fresh • Fast • Flavorful</span>
          <span className="animate-pulse">✦</span>
        </div>

        {/* Get Started button - fixed width to prevent text overflow */}
        <Button
          onClick={handleGetStarted}
          size="lg"
          className="mt-8 sm:mt-10 min-w-[200px] sm:min-w-[220px] h-12 sm:h-14 px-6 sm:px-10 text-base sm:text-lg font-bold rounded-full shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105 animate-fade-in-up"
          style={{ animationDelay: '0.3s' }}
        >
          Let's Get Started
        </Button>

        {/* Skip to home */}
        <button
          onClick={handleGuest}
          className="mt-4 sm:mt-5 text-xs sm:text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4"
        >
          Continue as guest →
        </button>
      </div>

      {/* Bottom decoration */}
      <div className="absolute bottom-6 sm:bottom-8 flex items-center gap-2 sm:gap-3 text-muted-foreground/60">
        <div className="h-px w-8 sm:w-12 bg-gradient-to-r from-transparent to-muted-foreground/30" />
        <span className="text-[10px] sm:text-xs font-medium">Made with ❤️</span>
        <div className="h-px w-8 sm:w-12 bg-gradient-to-l from-transparent to-muted-foreground/30" />
      </div>
    </div>
  );
}
