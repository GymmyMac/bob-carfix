import React from "react";
import { glassText } from "../../styles/glass";

interface ShelfHeaderProps {
  vehicleDisplayName: string;
  itemCount: number;
  isUpdating: boolean;
}

export const ShelfHeader: React.FC<ShelfHeaderProps> = ({
  vehicleDisplayName,
  itemCount,
  isUpdating,
}) => (
  <div
    className="sticky top-0 z-10 -mx-1 px-3 py-2.5"
    style={{
      background: "linear-gradient(135deg, rgba(0, 102, 204, 0.85) 0%, rgba(0, 73, 153, 0.9) 100%)",
      backdropFilter: "blur(20px) saturate(180%)",
      WebkitBackdropFilter: "blur(20px) saturate(180%)",
      borderRadius: "24px",
      boxShadow: "0 10px 40px rgba(0, 102, 204, 0.4)",
      border: "1px solid rgba(255, 255, 255, 0.25)",
    }}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {isUpdating ? (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.2)" }}>
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        )}
        <span style={{ ...glassText.primary, fontWeight: 700, fontSize: "14px", letterSpacing: "0.025em" }}>
          {isUpdating ? "Updating..." : vehicleDisplayName}
        </span>
      </div>
      <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "12px", fontWeight: 500 }}>
        {itemCount} {itemCount === 1 ? "item" : "items"}
      </span>
    </div>
  </div>
);
