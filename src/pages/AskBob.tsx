// src/pages/AskBob.tsx
// Demo route with mock CARFIX layout for testing BobStandalone
// This mirrors the actual CARFIX production setup

import React from 'react';
import { BobStandalone } from '../../packages/bob-widget/src';

/**
 * Mock CARFIX Header (72px)
 * Simulates the fixed header on the CARFIX production site
 */
function MockCarfixHeader() {
  return (
    <header 
      className="fixed top-0 left-0 right-0 h-[72px] bg-[#0052CC] flex items-center justify-between px-4 z-50"
      style={{ backgroundColor: '#0052CC' }}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">C</span>
        </div>
        <span className="text-white text-xl font-bold">CARFIX Demo</span>
      </div>
      <nav className="flex gap-4">
        <button className="text-white/80 hover:text-white text-sm">Parts</button>
        <button className="text-white/80 hover:text-white text-sm">Services</button>
        <button className="text-white/80 hover:text-white text-sm">About</button>
      </nav>
    </header>
  );
}

/**
 * Mock CARFIX Bottom Navigation (72px)
 * Simulates the fixed bottom nav on the CARFIX production site
 */
function MockCarfixBottomNav() {
  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 h-[72px] bg-[#0F172A] flex items-center justify-around z-50"
      style={{ 
        backgroundColor: '#0F172A',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)'
      }}
    >
      <button className="flex flex-col items-center gap-1 text-white/70 hover:text-white">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span className="text-xs">Home</span>
      </button>
      <button className="flex flex-col items-center gap-1 text-white/70 hover:text-white">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-xs">Search</span>
      </button>
      <button className="flex flex-col items-center gap-1 text-[#FF8C00] hover:text-[#FFB347]">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-xs font-semibold">Ask Bob</span>
      </button>
      <button className="flex flex-col items-center gap-1 text-white/70 hover:text-white relative">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
        <span className="text-xs">Cart</span>
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white">0</span>
      </button>
      <button className="flex flex-col items-center gap-1 text-white/70 hover:text-white">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-xs">Account</span>
      </button>
    </nav>
  );
}

/**
 * AskBob Page - Demo route with mock CARFIX layout
 * 
 * This demonstrates the correct integration of BobStandalone within 
 * a CARFIX-style layout with:
 * - Header: 72px fixed at top
 * - Bottom Navigation: 72px fixed at bottom
 * - Bob Container: fills space between (calc(100dvh - 144px))
 */
export default function AskBobPage() {
  return (
    <>
      {/* CARFIX Header - 72px fixed at top */}
      <MockCarfixHeader />
      
      {/* Bob Container - fills space between header and nav */}
      <main
        className="mt-[72px]"
        style={{
          height: 'calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
        }}
      >
        <BobStandalone
          partner="CARFIX"
          sessionToken=""
          onAddToCart={(item) => {
            console.log('[AskBob Demo] Add to cart:', item);
            alert(`Added to cart: ${item.product_name}`);
          }}
          onNavigate={(url) => {
            console.log('[AskBob Demo] Navigate:', url);
          }}
          onCheckout={(url) => {
            console.log('[AskBob Demo] Checkout:', url);
          }}
        />
      </main>
      
      {/* CARFIX Bottom Navigation - 72px fixed at bottom */}
      <MockCarfixBottomNav />
    </>
  );
}
