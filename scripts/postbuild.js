import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('dist');
const targetDirs = ['.next', 'build', 'out', '.output'];

function copyRecursiveSync(src, dest) {
  if (!fs.existsSync(src)) return;
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

for (const targetDir of targetDirs) {
  try {
    const fullTarget = path.resolve(targetDir);
    copyRecursiveSync(srcDir, fullTarget);
    console.log(`[postbuild] Copied build output from dist to ${targetDir}`);
  } catch (err) {
    console.warn(`[postbuild] Could not copy to ${targetDir}:`, err);
  }
}
