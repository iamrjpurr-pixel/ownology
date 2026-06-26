import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center px-4"
      style={{ background: "var(--background)" }}
    >
      <div className="w-full max-w-lg text-center">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-full animate-pulse"
              style={{ background: "color-mix(in oklch, var(--ow-amber) 18%, transparent)" }}
            />
            <AlertCircle className="relative h-14 w-14" style={{ color: "var(--ow-amber)" }} />
          </div>
        </div>

        <h1
          className="text-5xl font-bold mb-2"
          style={{ fontFamily: "'Fraunces', serif", color: "var(--foreground)" }}
        >
          404
        </h1>

        <h2
          className="text-xl font-semibold mb-4"
          style={{ fontFamily: "'Fraunces', serif", color: "var(--foreground)" }}
        >
          Page Not Found
        </h2>

        <p className="mb-8 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
          Sorry, the page you are looking for doesn't exist.
          <br />
          It may have been moved or deleted.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleGoHome}
            className="px-6 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
            style={{ background: "var(--ow-amber)", color: "#1C1813" }}
          >
            <Home className="w-4 h-4 mr-2" />
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
