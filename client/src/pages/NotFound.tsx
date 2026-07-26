import { Button } from "@/components/ui/button";
import { AlertCircle, Home } from "lucide-react";
import { useLocation } from "wouter";

export default function NotFound() {
  const [, setLocation] = useLocation();

  const handleGoHome = () => {
    setLocation("/");
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <AlertCircle className="h-16 w-16 text-[#FF385C]" />
        </div>

        <h1 className="mb-2 text-4xl font-bold text-foreground">404</h1>

        <h2 className="mb-4 text-xl font-semibold text-foreground">
          Page Not Found
        </h2>

        <p className="mb-8 leading-relaxed text-muted-foreground">
          Sorry, the page you are looking for doesn&apos;t exist.
          <br />
          It may have been moved or deleted.
        </p>

        <Button
          onClick={handleGoHome}
          className="bg-[#FF385C] text-white hover:bg-[#E31C5F]"
        >
          <Home className="mr-2 h-4 w-4" />
          Go Home
        </Button>
      </div>
    </div>
  );
}
