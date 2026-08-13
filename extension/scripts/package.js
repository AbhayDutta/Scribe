import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const extensionRoot = path.resolve(__dirname, '..');
const distDir = path.resolve(extensionRoot, 'dist');
const zipFile = path.resolve(extensionRoot, 'scribe-extension-v1.0.0.zip');

if (!fs.existsSync(distDir)) {
  console.error('dist directory does not exist. Run npm run build first.');
  process.exit(1);
}

// Remove old zip if exists
if (fs.existsSync(zipFile)) {
  fs.unlinkSync(zipFile);
}

try {
  if (process.platform === 'win32') {
    // Use PowerShell Compress-Archive
    execSync(`powershell -Command "Compress-Archive -Path '${distDir}\\*' -DestinationPath '${zipFile}' -Force"`, { stdio: 'inherit' });
  } else {
    // Use zip CLI
    execSync(`cd "${distDir}" && zip -r "${zipFile}" .`, { stdio: 'inherit' });
  }

  const stats = fs.statSync(zipFile);
  const sizeKb = (stats.size / 1024).toFixed(1);
  console.log(`\n🎉 Successfully packaged extension for Chrome Web Store!`);
  console.log(`📦 Output: ${zipFile} (${sizeKb} KB)`);
} catch (err) {
  console.error('Failed to create zip package:', err);
  process.exit(1);
}
