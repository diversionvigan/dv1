#!/usr/bin/env node
import { execSync } from 'child_process';

console.log('[Next.js Compatibility Layer] Executing build pipeline...');

try {
  execSync('npx vite build', { stdio: 'inherit' });
  execSync('node scripts/postbuild.js', { stdio: 'inherit' });
  console.log('[Next.js Compatibility Layer] Build completed successfully into .next and dist directories.');
} catch (error) {
  console.error('[Next.js Compatibility Layer] Build failed:', error);
  process.exit(1);
}
