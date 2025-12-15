import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface ProductShelfLoadingProps {
  className?: string;
}

export const ProductShelfLoading = ({ className }: ProductShelfLoadingProps) => {
  const [dots, setDots] = useState("");

  // Animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? "" : prev + ".");
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center gap-6 ${className}`}>
      {/* Pulsing loader */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <div className="relative w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      </div>
      
      {/* Text */}
      <div className="text-center">
        <p className="text-lg font-medium text-foreground">
          Bob is finding parts{dots}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Searching for the best options for your vehicle
        </p>
      </div>
    </div>
  );
};
