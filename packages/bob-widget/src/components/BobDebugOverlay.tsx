/**
 * BobDebugOverlay - Diagnostic overlay for partner integration troubleshooting
 * 
 * Shows:
 * - Partner config loaded status
 * - Session token status
 * - Viewport size and device type
 * - Position factors being applied
 * - Animation states count
 * - Service packages and products count
 * - CSS conflict detection
 */

import React, { useState, useEffect } from 'react';
import { BOB_VERSION } from '../version';
import type { PartnerConfig } from '../types/partner';

interface BobDebugOverlayProps {
  partnerConfig: PartnerConfig | null;
  sessionToken?: string;
}

interface DebugInfo {
  viewport: {
    width: number;
    height: number;
    deviceType: string;
  };
  origin: string;
  originAllowed: boolean;
  userAgent: string;
  timestamp: string;
}

/**
 * Detect device type from viewport width
 */
function getDeviceType(width: number): string {
  if (width < 640) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Check for common CSS conflicts
 */
function detectCssConflicts(): string[] {
  const conflicts: string[] = [];
  
  if (typeof window === 'undefined') return conflicts;

  const bobRoot = document.querySelector('.bob-widget-root');
  if (!bobRoot) {
    conflicts.push('bob-widget-root not found in DOM');
    return conflicts;
  }

  const styles = window.getComputedStyle(bobRoot);
  
  // Check for problematic overflow
  const parentElement = bobRoot.parentElement;
  if (parentElement) {
    const parentStyles = window.getComputedStyle(parentElement);
    if (parentStyles.overflow === 'hidden') {
      conflicts.push('Parent has overflow:hidden - may clip Bob');
    }
  }

  // Check for transform interference
  if (styles.transform !== 'none' && styles.transform !== 'matrix(1, 0, 0, 1, 0, 0)') {
    conflicts.push(`Unexpected transform on root: ${styles.transform}`);
  }

  // Check isolation
  if (styles.isolation !== 'isolate') {
    conflicts.push('Isolation not properly set');
  }

  return conflicts;
}

export const BobDebugOverlay: React.FC<BobDebugOverlayProps> = ({
  partnerConfig,
  sessionToken,
}) => {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [cssConflicts, setCssConflicts] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const updateDebugInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setDebugInfo({
        viewport: {
          width,
          height,
          deviceType: getDeviceType(width),
        },
        origin: window.location.origin,
        originAllowed: partnerConfig?.allowed_origins?.some(o => 
          o === window.location.origin || o.includes('*')
        ) ?? false,
        userAgent: navigator.userAgent.slice(0, 50) + '...',
        timestamp: new Date().toISOString(),
      });

      setCssConflicts(detectCssConflicts());
    };

    updateDebugInfo();
    window.addEventListener('resize', updateDebugInfo);
    
    return () => window.removeEventListener('resize', updateDebugInfo);
  }, [partnerConfig]);

  if (!debugInfo) return null;

  const StatusBadge: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '11px',
      fontWeight: 500,
      background: ok ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
      color: ok ? '#22c55e' : '#ef4444',
    }}>
      {ok ? '✓' : '✗'} {label}
    </span>
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: '8px',
        right: '8px',
        zIndex: 99999,
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
        fontSize: '11px',
        lineHeight: 1.4,
      }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '24px',
          height: '24px',
          background: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1,
        }}
      >
        {isCollapsed ? '🔍' : '✕'}
      </button>

      {!isCollapsed && (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.9)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            padding: '12px',
            color: '#fff',
            maxWidth: '320px',
            backdropFilter: 'blur(8px)',
          }}
        >
          {/* Header */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            marginBottom: '12px',
            paddingBottom: '8px',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
          }}>
            <span style={{ fontSize: '14px' }}>🔧</span>
            <span style={{ fontWeight: 600 }}>Bob Debug v{BOB_VERSION}</span>
          </div>

          {/* Status badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
            <StatusBadge ok={!!partnerConfig} label={`Partner: ${partnerConfig?.partner_code || 'none'}`} />
            <StatusBadge ok={!!sessionToken} label={sessionToken ? 'Session' : 'No Session'} />
            <StatusBadge ok={debugInfo.originAllowed} label="Origin" />
          </div>

          {/* Config details */}
          <div style={{ display: 'grid', gap: '6px' }}>
            <Row label="Viewport" value={`${debugInfo.viewport.width}×${debugInfo.viewport.height} (${debugInfo.viewport.deviceType})`} />
            <Row label="Origin" value={debugInfo.origin} />
            <Row label="Bottom Offset" value={`${partnerConfig?.default_bottom_offset ?? 0}px`} />
            <Row label="Z-Index Base" value={`${partnerConfig?.default_z_index_base ?? 50}`} />
            <Row label="Blur" value={`${partnerConfig?.backdrop_blur_intensity ?? 8}px`} />
            <Row label="Overlay" value={`${((partnerConfig?.backdrop_overlay_opacity ?? 0.15) * 100).toFixed(0)}%`} />
          </div>

          {/* Feature flags */}
          {partnerConfig?.feature_flags && (
            <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>Features:</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {Object.entries(partnerConfig.feature_flags).map(([key, value]) => (
                  <StatusBadge key={key} ok={!!value} label={key.replace(/([A-Z])/g, ' $1').trim()} />
                ))}
              </div>
            </div>
          )}

          {/* CSS Conflicts */}
          {cssConflicts.length > 0 && (
            <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ color: '#ef4444', marginBottom: '4px' }}>⚠️ CSS Conflicts:</div>
              {cssConflicts.map((conflict, i) => (
                <div key={i} style={{ color: '#fca5a5', fontSize: '10px' }}>
                  • {conflict}
                </div>
              ))}
            </div>
          )}

          {/* Timestamp */}
          <div style={{ 
            marginTop: '12px', 
            paddingTop: '8px', 
            borderTop: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '10px',
          }}>
            {debugInfo.timestamp}
          </div>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
    <span style={{ color: 'rgba(255,255,255,0.5)' }}>{label}:</span>
    <span style={{ color: '#fff', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
  </div>
);

export default BobDebugOverlay;
