import * as React from "react";
import { cn } from "@/lib/utils";

interface RipplePulseLoaderProps {
  className?: string;
  show?: boolean;
  contained?: boolean;
  size?: "sm" | "md" | "lg";
}

const RipplePulseLoader: React.FC<RipplePulseLoaderProps> = ({
  className,
  show = true,
  contained = false,
  size = "md",
}) => {
  if (!show) return null;

  const containerClass = contained
    ? "absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm"
    : "fixed inset-0 z-40 flex items-center justify-center bg-background/80 backdrop-blur-sm";

  return (
    <div className={cn(containerClass, className)}>
      <div className={cn("ripple-loader", `ripple-loader-${size}`)}>
        <div className="ripple-circle ripple-circle-1" />
        <div className="ripple-circle ripple-circle-2" />
        <div className="ripple-circle ripple-circle-3" />
        <div className="ripple-circle ripple-circle-4" />
      </div>
    </div>
  );
};

export { RipplePulseLoader };
