#!/usr/bin/env node

/**
 * Bob Widget CLI - 3-Stage Installation Process
 * 
 * Usage:
 *   npx @gymmymac/bob-widget carfix stage-a
 *   npx @gymmymac/bob-widget carfix stage-b --target next-pages
 *   npx @gymmymac/bob-widget carfix stage-c --partner CARFIX
 */

import { execSync, spawn } from 'child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const INSTALL_DIR = join(__dirname, '..', 'install', 'carfix');

const VERSION = '3.1.11';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(msg, color = 'reset') {
  console.log(`${COLORS[color]}${msg}${COLORS.reset}`);
}

function logHeader(title) {
  log('');
  log('══════════════════════════════════════════════════════════════', 'cyan');
  log(`  ${title}`, 'bold');
  log('══════════════════════════════════════════════════════════════', 'cyan');
  log('');
}

function logSuccess(msg) {
  log(`  ✓ ${msg}`, 'green');
}

function logError(msg) {
  log(`  ✗ ${msg}`, 'red');
}

function logWarning(msg) {
  log(`  ⚠ ${msg}`, 'yellow');
}

function logStep(step, msg) {
  log(`Step ${step}: ${msg}...`, 'blue');
}

// ============================================================================
// STAGE A: Forensic Scan & Purge
// ============================================================================
async function stageA() {
  logHeader('STAGE A: FORENSIC REMOVAL - Bob Widget Complete Uninstall');
  log('⚠️  WARNING: This will detect and help remove ALL Bob-related code', 'yellow');
  log('');

  let hasIssues = false;

  // Step 1: Scan for Bob-related files
  logStep(1, 'Scanning for Bob-related files');
  try {
    const result = execSync(`find . -path ./node_modules -prune -o \\( -name "Bob*.tsx" -o -name "*Bob*.tsx" -o -name "AskBob*.tsx" -o -name "useBob*.ts" -o -name "useBob*.tsx" -o -name "*bob*.d.ts" \\) -print 2>/dev/null | grep -v node_modules`, { encoding: 'utf8' }).trim();
    if (result) {
      logError('Found Bob component/hook files:');
      result.split('\n').forEach(f => log(`    ${f}`, 'yellow'));
      hasIssues = true;
    } else {
      logSuccess('No Bob component files found outside node_modules');
    }
  } catch {
    logSuccess('No Bob component files found outside node_modules');
  }

  // Step 2: Scan for Bob imports
  logStep(2, 'Scanning for Bob imports in source files');
  try {
    const result = execSync(`grep -rl "@gymmymac/bob-widget\\|from 'bob-widget'\\|useBob\\|<Bob\\|<BobWidget\\|<BobStandalone" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules . 2>/dev/null`, { encoding: 'utf8' }).trim();
    if (result) {
      logError('Found Bob imports in:');
      result.split('\n').forEach(f => log(`    ${f}`, 'yellow'));
      hasIssues = true;
    } else {
      logSuccess('No Bob imports found in source files');
    }
  } catch {
    logSuccess('No Bob imports found in source files');
  }

  // Step 3: Scan for BOB_ environment variables
  logStep(3, 'Scanning for legacy environment variables');
  try {
    const result = execSync(`grep -l "BOB_SUPABASE\\|BOB_API\\|BOB_PARTNER" .env* 2>/dev/null`, { encoding: 'utf8' }).trim();
    if (result) {
      logError('Found BOB_ variables in:');
      result.split('\n').forEach(f => log(`    ${f}`, 'yellow'));
      hasIssues = true;
    } else {
      logSuccess('No BOB_ environment variables found');
    }
  } catch {
    logSuccess('No BOB_ environment variables found');
  }

  // Step 4: Check if bob-widget is installed
  logStep(4, 'Checking for existing bob-widget installation');
  try {
    const result = execSync(`npm ls @gymmymac/bob-widget --depth=0 2>/dev/null`, { encoding: 'utf8' });
    if (result.includes('@gymmymac/bob-widget')) {
      logWarning('bob-widget package is installed (will be removed in purge step)');
    }
  } catch {
    logSuccess('No existing bob-widget installation');
  }

  if (hasIssues) {
    log('');
    log('══════════════════════════════════════════════════════════════', 'red');
    log('  ✗ STAGE A INCOMPLETE - Issues detected above', 'red');
    log('══════════════════════════════════════════════════════════════', 'red');
    log('');
    log('ACTION REQUIRED:', 'yellow');
    log('1. Delete the Bob-related files listed above', 'yellow');
    log('2. Remove Bob imports from the files listed above', 'yellow');
    log('3. Remove BOB_ variables from .env files', 'yellow');
    log('4. Re-run: npx @gymmymac/bob-widget carfix stage-a', 'yellow');
    log('');
    log('After manual cleanup, run the cache purge:', 'cyan');
    log('  npx @gymmymac/bob-widget carfix stage-a --purge', 'cyan');
    process.exit(1);
  }

  // If no issues, proceed with cache purge
  log('');
  log('No legacy Bob code detected. Proceeding with cache purge...', 'green');
  await purgeCache();
}

async function purgeCache() {
  logStep(5, 'Uninstalling bob-widget package (if exists)');
  try {
    execSync('npm uninstall @gymmymac/bob-widget 2>/dev/null', { stdio: 'inherit' });
    logSuccess('Package uninstalled');
  } catch {
    logSuccess('Package not installed');
  }

  logStep(6, 'Removing node_modules');
  try {
    execSync('rm -rf node_modules', { stdio: 'inherit' });
    logSuccess('node_modules removed');
  } catch (e) {
    logWarning('Could not remove node_modules: ' + e.message);
  }

  logStep(7, 'Clearing build caches');
  try {
    execSync('rm -rf node_modules/.vite node_modules/.cache .next/cache .vite dist .turbo 2>/dev/null', { stdio: 'inherit' });
    logSuccess('Build caches cleared');
  } catch {
    logSuccess('No caches to clear');
  }

  logStep(8, 'Removing lock file');
  try {
    execSync('rm -f package-lock.json', { stdio: 'inherit' });
    logSuccess('Lock file removed');
  } catch {
    logWarning('Could not remove lock file');
  }

  logStep(9, 'Cleaning npm cache');
  try {
    execSync('npm cache clean --force 2>/dev/null', { stdio: 'inherit' });
    logSuccess('npm cache cleaned');
  } catch {
    logWarning('Could not clean npm cache');
  }

  logStep(10, 'Reinstalling base dependencies');
  try {
    execSync('npm install', { stdio: 'inherit' });
    logSuccess('Dependencies reinstalled');
  } catch (e) {
    logError('Failed to reinstall dependencies: ' + e.message);
    process.exit(1);
  }

  log('');
  logHeader('✓ STAGE A COMPLETE - Forensic removal successful');
  log('NEXT: Proceed to STAGE B - Page Preparation', 'cyan');
  log('  npx @gymmymac/bob-widget carfix stage-b --target next-pages', 'cyan');
}

// ============================================================================
// STAGE B: Generate Container Template
// ============================================================================
function stageB(args) {
  logHeader('STAGE B: PAGE PREPARATION - Generate Bob Container');

  const targetIdx = args.indexOf('--target');
  const target = targetIdx !== -1 ? args[targetIdx + 1] : 'next-pages';

  const outputIdx = args.indexOf('--output');
  const outputPath = outputIdx !== -1 ? args[outputIdx + 1] : null;

  const withLayout = args.includes('--with-layout');

  log(`Target framework: ${target}`, 'blue');
  log(`Include layout components: ${withLayout ? 'Yes' : 'No'}`, 'blue');
  log('');

  // Generate layout component templates if --with-layout is provided
  const headerTemplate = `// components/CarfixHeader.tsx
// Generated by Bob Widget CLI v${VERSION}
// 
// CARFIX Header Component - 72px fixed at top

import React from 'react';

export function CarfixHeader() {
  return (
    <header 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '72px',
        backgroundColor: '#0052CC', // CARFIX Royal Blue
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img src="/carfix-logo.svg" alt="CARFIX" style={{ height: '40px' }} />
        <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold' }}>CARFIX</span>
      </div>
      <nav style={{ display: 'flex', gap: '16px' }}>
        <a href="/" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>Home</a>
        <a href="/parts" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>Parts</a>
        <a href="/cart" style={{ color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>Cart</a>
      </nav>
    </header>
  );
}
`;

  const bottomNavTemplate = `// components/CarfixBottomNav.tsx
// Generated by Bob Widget CLI v${VERSION}
// 
// CARFIX Bottom Navigation Component - 72px fixed at bottom

import React from 'react';

export function CarfixBottomNav() {
  return (
    <nav 
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '72px',
        backgroundColor: '#0F172A', // CARFIX Deep Navy
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '8px 16px',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        zIndex: 50,
      }}
    >
      <button style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}>
        <span>🏠</span>
        <div style={{ fontSize: '10px' }}>Home</div>
      </button>
      <button style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}>
        <span>🔍</span>
        <div style={{ fontSize: '10px' }}>Search</div>
      </button>
      <button style={{ color: '#FF8C00', background: 'none', border: 'none', cursor: 'pointer' }}>
        <span>💬</span>
        <div style={{ fontSize: '10px' }}>Ask Bob</div>
      </button>
      <button style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}>
        <span>🛒</span>
        <div style={{ fontSize: '10px' }}>Cart</div>
      </button>
      <button style={{ color: 'white', background: 'none', border: 'none', cursor: 'pointer' }}>
        <span>👤</span>
        <div style={{ fontSize: '10px' }}>Account</div>
      </button>
    </nav>
  );
}
`;

  let template = '';
  let filename = '';

  switch (target) {
    case 'next-pages':
      filename = 'pages/ask-bob.tsx';
      if (withLayout) {
        template = `// pages/ask-bob.tsx
// Generated by Bob Widget CLI v${VERSION}
// 
// ⚠️ PREREQUISITES:
// - STAGE A (Forensic Removal) must be complete
// - CarfixHeader and CarfixBottomNav components created

import React from 'react';
import { CarfixHeader } from '../components/CarfixHeader';
import { CarfixBottomNav } from '../components/CarfixBottomNav';

/**
 * AskBob Page - Bob Widget Container with CARFIX Layout
 * 
 * Layout structure:
 * - Header: 72px fixed at top
 * - Bottom Navigation: 72px fixed at bottom
 * - Bob Container: fills space between (144px offset)
 */
export default function AskBobPage() {
  // STAGE C: Replace this placeholder with BobStandalone component
  return (
    <>
      <CarfixHeader />
      
      <main
        style={{
          marginTop: '72px',
          height: 'calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          backgroundColor: '#0a1628',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}
      >
        <p>Bob Container Ready - Proceed to Stage C</p>
      </main>
      
      <CarfixBottomNav />
    </>
  );
}
`;
      } else {
        template = `// pages/ask-bob.tsx
// Generated by Bob Widget CLI v${VERSION}
// 
// ⚠️ PREREQUISITES:
// - STAGE A (Forensic Removal) must be complete
// - This file is a PLACEHOLDER - Bob is installed in Stage C
// - ⚠️ This assumes CARFIX Header (72px) and Bottom Nav (72px) already exist
//   If they don't exist, run: npx @gymmymac/bob-widget carfix stage-b --target next-pages --with-layout

import React from 'react';

/**
 * AskBob Page - Bob Widget Container
 * 
 * This page is rendered within the CARFIX layout which provides:
 * - Header: 72px fixed at top
 * - Bottom Navigation: 72px fixed at bottom
 * 
 * The container below fits BETWEEN these elements.
 */
export default function AskBobPage() {
  // STAGE C: Replace this placeholder with BobStandalone component
  return (
    <div 
      id="bob-container"
      style={{ 
        height: 'calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        backgroundColor: '#0a1628',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}
    >
      <p>Bob Container Ready - Proceed to Stage C</p>
    </div>
  );
}
`;
      }
      break;

    case 'next-app':
      filename = 'app/ask-bob/page.tsx';
      if (withLayout) {
        template = `// app/ask-bob/page.tsx
// Generated by Bob Widget CLI v${VERSION}
'use client';

import React from 'react';
import { CarfixHeader } from '../../components/CarfixHeader';
import { CarfixBottomNav } from '../../components/CarfixBottomNav';

/**
 * AskBob Page - Bob Widget Container with CARFIX Layout
 */
export default function AskBobPage() {
  return (
    <>
      <CarfixHeader />
      
      <main
        style={{
          marginTop: '72px',
          height: 'calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          backgroundColor: '#0a1628',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}
      >
        <p>Bob Container Ready - Proceed to Stage C</p>
      </main>
      
      <CarfixBottomNav />
    </>
  );
}
`;
      } else {
        template = `// app/ask-bob/page.tsx
// Generated by Bob Widget CLI v${VERSION}
'use client';

import React from 'react';

/**
 * AskBob Page - Bob Widget Container
 * 
 * ⚠️ This assumes CARFIX Header (72px) and Bottom Nav (72px) already exist
 * If they don't exist, run: npx @gymmymac/bob-widget carfix stage-b --target next-app --with-layout
 */
export default function AskBobPage() {
  return (
    <div 
      id="bob-container"
      style={{ 
        height: 'calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        backgroundColor: '#0a1628',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}
    >
      <p>Bob Container Ready - Proceed to Stage C</p>
    </div>
  );
}
`;
      }
      break;

    case 'react-router':
      filename = 'src/pages/AskBob.tsx';
      if (withLayout) {
        template = `// src/pages/AskBob.tsx
// Generated by Bob Widget CLI v${VERSION}

import React from 'react';
import { CarfixHeader } from '../components/CarfixHeader';
import { CarfixBottomNav } from '../components/CarfixBottomNav';

/**
 * AskBob Page - Bob Widget Container with CARFIX Layout
 */
export const AskBobPage: React.FC = () => {
  return (
    <>
      <CarfixHeader />
      
      <main
        style={{
          marginTop: '72px',
          height: 'calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))',
          position: 'relative',
          overflow: 'hidden',
          width: '100%',
          backgroundColor: '#0a1628',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white'
        }}
      >
        <p>Bob Container Ready - Proceed to Stage C</p>
      </main>
      
      <CarfixBottomNav />
    </>
  );
};

export default AskBobPage;
`;
      } else {
        template = `// src/pages/AskBob.tsx
// Generated by Bob Widget CLI v${VERSION}

import React from 'react';

/**
 * AskBob Page - Bob Widget Container
 * 
 * ⚠️ This assumes CARFIX Header (72px) and Bottom Nav (72px) already exist
 * If they don't exist, run: npx @gymmymac/bob-widget carfix stage-b --target react-router --with-layout
 */
export const AskBobPage: React.FC = () => {
  return (
    <div 
      id="bob-container"
      style={{ 
        height: 'calc(100dvh - 144px - env(safe-area-inset-bottom, 0px))',
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        backgroundColor: '#0a1628',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}
    >
      <p>Bob Container Ready - Proceed to Stage C</p>
    </div>
  );
};

export default AskBobPage;
`;
      }
      break;

    default:
      logError(`Unknown target: ${target}`);
      log('');
      log('Supported targets:', 'yellow');
      log('  next-pages   - Next.js Pages Router', 'yellow');
      log('  next-app     - Next.js App Router', 'yellow');
      log('  react-router - React Router (Vite)', 'yellow');
      process.exit(1);
  }

  // Output layout components if --with-layout flag is used
  if (withLayout) {
    log('═'.repeat(60), 'cyan');
    log('CARFIX HEADER COMPONENT (72px)', 'green');
    log('═'.repeat(60), 'cyan');
    console.log(headerTemplate);
    
    log('═'.repeat(60), 'cyan');
    log('CARFIX BOTTOM NAVIGATION COMPONENT (72px)', 'green');
    log('═'.repeat(60), 'cyan');
    console.log(bottomNavTemplate);
    
    log('═'.repeat(60), 'cyan');
    log('');
    log('⚠️  Save the above components before proceeding:', 'yellow');
    log('    1. Create components/CarfixHeader.tsx', 'yellow');
    log('    2. Create components/CarfixBottomNav.tsx', 'yellow');
    log('');
  }

  log('Generated page template:', 'green');
  log('═'.repeat(60), 'cyan');
  console.log(template);
  log('═'.repeat(60), 'cyan');

  if (outputPath) {
    try {
      const dir = dirname(outputPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(outputPath, template);
      logSuccess(`Template written to: ${outputPath}`);
    } catch (e) {
      logError(`Failed to write template: ${e.message}`);
      process.exit(1);
    }
  } else {
    log('');
    log(`To save this template, run:`, 'yellow');
    if (withLayout) {
      log(`  npx @gymmymac/bob-widget carfix stage-b --target ${target} --with-layout --output ${filename}`, 'cyan');
    } else {
      log(`  npx @gymmymac/bob-widget carfix stage-b --target ${target} --output ${filename}`, 'cyan');
    }
  }

  log('');
  logHeader('✓ STAGE B COMPLETE - Page template ready');
  log('NEXT: Proceed to STAGE C - Install & Verify', 'cyan');
  log('  npx @gymmymac/bob-widget carfix stage-c --partner CARFIX', 'cyan');
}

// ============================================================================
// STAGE C: Install & Verify
// ============================================================================
async function stageC(args) {
  logHeader(`STAGE C: INSTALL & VERIFY - Bob Widget v${VERSION}`);

  const partnerIdx = args.indexOf('--partner');
  const partner = partnerIdx !== -1 ? args[partnerIdx + 1] : 'CARFIX';

  // Step 1: Check if old package exists
  logStep(1, 'Checking for legacy installation');
  try {
    const result = execSync('npm ls @gymmymac/bob-widget --depth=0 2>/dev/null', { encoding: 'utf8' });
    if (result.includes('@gymmymac/bob-widget')) {
      logWarning('Existing bob-widget found - will be upgraded');
    }
  } catch {
    logSuccess('No existing installation');
  }

  // Step 2: Install bob-widget
  logStep(2, `Installing @gymmymac/bob-widget@${VERSION}`);
  try {
    execSync(`npm install @gymmymac/bob-widget@${VERSION}`, { stdio: 'inherit' });
    logSuccess('Package installed');
  } catch (e) {
    logError(`Failed to install: ${e.message}`);
    process.exit(1);
  }

  // Step 3: Verify version
  logStep(3, 'Verifying installed version');
  try {
    const result = execSync('npm ls @gymmymac/bob-widget --depth=0', { encoding: 'utf8' });
    if (result.includes(`@${VERSION}`)) {
      logSuccess(`Package version: ${VERSION}`);
    } else {
      logError(`Version mismatch - expected ${VERSION}`);
      process.exit(1);
    }
  } catch (e) {
    logError(`Failed to verify version: ${e.message}`);
    process.exit(1);
  }

  // Step 4: Verify backend reachability
  logStep(4, `Verifying backend connection for partner: ${partner}`);
  try {
    const response = await fetch('https://gjoguxzstsihhxvdgpto.supabase.co/rest/v1/bob_partners?partner_code=eq.' + partner + '&is_active=eq.true&select=partner_code,display_name,api_base_url', {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdqb2d1eHpzdHNpaGh4dmRncHRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MzgyODEsImV4cCI6MjA3OTUxNDI4MX0.detu4TKB7RjC6l6CrVaPYoi0Hhz2asDt6zxNx1cdzq8',
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    if (data && data.length > 0) {
      logSuccess(`Partner config found: ${data[0].display_name}`);
      logSuccess(`API Base URL: ${data[0].api_base_url}`);
    } else {
      logError(`Partner "${partner}" not found in database`);
      process.exit(1);
    }
  } catch (e) {
    logError(`Backend verification failed: ${e.message}`);
    log('');
    log('This may indicate:', 'yellow');
    log('  - Network connectivity issues', 'yellow');
    log('  - Partner not configured in database', 'yellow');
    log('  - Supabase service unavailable', 'yellow');
    process.exit(1);
  }

  log('');
  logHeader('✓ STAGE C COMPLETE - Bob Widget installed successfully');
  log('');
  log('NEXT STEPS:', 'cyan');
  log('1. Update your page to import BobStandalone', 'cyan');
  log('2. Replace the placeholder with the component', 'cyan');
  log('3. Run verification checklist in browser', 'cyan');
  log('');
  log('Final code:', 'green');
  console.log(`
import { BobStandalone } from '@gymmymac/bob-widget';

<BobStandalone
  partner="${partner}"
  sessionToken={sessionToken}
  onAddToCart={(item) => addToCart(item)}
  onNavigate={(url) => router.push(url)}
/>
`);
  
  log('');
  log('Browser verification checklist:', 'yellow');
  log(`  ✓ Console shows: [BobWidget] Package loaded - v${VERSION}`, 'yellow');
  log('  ✓ Bob character fully visible, not cropped', 'yellow');
  log('  ✓ Background is NOT blurred', 'yellow');
  log('  ✓ Bob is prominently sized', 'yellow');
  log('  ✓ Chat input works', 'yellow');
}

// ============================================================================
// Main CLI
// ============================================================================
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === 'help' || args[0] === '--help') {
  log('');
  log('Bob Widget CLI v' + VERSION, 'bold');
  log('');
  log('Usage:', 'cyan');
  log('  npx @gymmymac/bob-widget carfix <stage> [options]', 'cyan');
  log('');
  log('Stages:', 'yellow');
  log('  stage-a              Forensic scan and cache purge', 'yellow');
  log('  stage-a --purge      Skip scan, just purge caches', 'yellow');
  log('  stage-b              Generate page container template', 'yellow');
  log('  stage-c              Install and verify', 'yellow');
  log('');
  log('Stage B Options:', 'blue');
  log('  --target <framework>  next-pages | next-app | react-router', 'blue');
  log('  --output <path>       Write template to file', 'blue');
  log('  --with-layout         Generate Header and BottomNav components too', 'blue');
  log('');
  log('Stage C Options:', 'blue');
  log('  --partner <code>      Partner code (default: CARFIX)', 'blue');
  log('');
  log('Examples:', 'green');
  log('  npx @gymmymac/bob-widget carfix stage-a', 'green');
  log('  npx @gymmymac/bob-widget carfix stage-b --target next-pages --output pages/ask-bob.tsx', 'green');
  log('  npx @gymmymac/bob-widget carfix stage-b --target next-pages --with-layout', 'green');
  log('  npx @gymmymac/bob-widget carfix stage-c --partner CARFIX', 'green');
  process.exit(0);
}

if (args[0] !== 'carfix') {
  logError(`Unknown command: ${args[0]}`);
  log('Run with --help for usage', 'yellow');
  process.exit(1);
}

const stage = args[1];

switch (stage) {
  case 'stage-a':
    if (args.includes('--purge')) {
      purgeCache();
    } else {
      stageA();
    }
    break;
  case 'stage-b':
    stageB(args);
    break;
  case 'stage-c':
    stageC(args);
    break;
  default:
    logError(`Unknown stage: ${stage}`);
    log('Valid stages: stage-a, stage-b, stage-c', 'yellow');
    process.exit(1);
}
