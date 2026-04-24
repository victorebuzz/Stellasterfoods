import { createFileRoute } from "@tanstack/react-router";
import { SplashScreen } from "@/components/SplashScreen";

export const Route = createFileRoute("/splash")({
  component: SplashPage,
});

function SplashPage() {
  return <SplashScreen />;
}
