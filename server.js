// Hostinger Node.js Application Entry Point for viganbooking.com
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

try {
  register('tsx/esm', pathToFileURL('./'));
} catch (e) {
  // tsx registered or running under tsx CLI
}

import('./server.ts').catch((err) => {
  console.error('[Hostinger Server Entry Error]:', err);
});
