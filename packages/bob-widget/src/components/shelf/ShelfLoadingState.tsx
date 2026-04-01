import React from "react";
import { glassText } from "../../styles/glass";

export const ShelfLoading: React.FC = () => (
  <div className="p-5">
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(0, 102, 204, 0.3)" }}>
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "rgba(255,255,255,0.8)", borderTopColor: "transparent" }} />
      </div>
      <div>
        <p style={{ ...glassText.primary, fontWeight: 600, fontSize: "14px" }}>Loading parts...</p>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", marginTop: "2px" }}>Bob's stocking the shelves</p>
      </div>
    </div>
  </div>
);

export const ShelfEmpty: React.FC<{ productCount: number; packageCount: number }> = ({ productCount, packageCount }) => (
  <div className="p-5">
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "rgba(255, 149, 0, 0.3)" }}>
        <svg className="w-5 h-5" style={{ color: "#FF9500" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <p style={{ ...glassText.primary, fontWeight: 600, fontSize: "14px" }}>No products to display</p>
        <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", marginTop: "2px" }}>
          Products: {productCount} | Packages: {packageCount}
        </p>
      </div>
    </div>
  </div>
);
