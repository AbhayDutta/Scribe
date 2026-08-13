import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs';

const rootDir = process.cwd();
const distDir = resolve(rootDir, 'dist');

async function buildAll() {
  console.log('🚀 Starting Scribe Extension Build...');

  // Clean dist
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir, { recursive: true });

  // 1. Build Popup
  console.log('📦 [1/3] Building Popup...');
  await build({
    configFile: false,
    plugins: [react()],
    root: rootDir,
    base: '',
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      rollupOptions: {
        input: {
          popup: resolve(rootDir, 'src/popup/index.html'),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
  });

  // 2. Build Content Script as standalone IIFE (All dependencies bundled, NO imports)
  console.log('📦 [2/3] Building Content Script (Standalone IIFE)...');
  await build({
    configFile: false,
    plugins: [react()],
    root: rootDir,
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(rootDir, 'src/content/index.tsx'),
        name: 'ScribeContent',
        formats: ['iife'],
        fileName: () => 'content.js',
      },
      rollupOptions: {
        output: {
          extend: true,
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && assetInfo.name.endsWith('.css')) {
              return 'assets/content.css';
            }
            return 'assets/[name].[ext]';
          },
        },
      },
    },
  });

  // 3. Build Background Service Worker as standalone IIFE
  console.log('📦 [3/3] Building Background Service Worker...');
  await build({
    configFile: false,
    root: rootDir,
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      lib: {
        entry: resolve(rootDir, 'src/background/background.ts'),
        name: 'ScribeBackground',
        formats: ['iife'],
        fileName: () => 'background.js',
      },
    },
  });

  // 4. Copy manifest.json & public/
  console.log('📋 Copying Manifest and Public Assets...');
  const manifestSrc = resolve(rootDir, 'manifest.json');
  const manifestDest = resolve(distDir, 'manifest.json');
  if (fs.existsSync(manifestSrc)) {
    fs.copyFileSync(manifestSrc, manifestDest);
  }

  const publicDir = resolve(rootDir, 'public');
  if (fs.existsSync(publicDir)) {
    fs.cpSync(publicDir, distDir, { recursive: true });
  }

  console.log('✅ Extension build completed successfully! Output in dist/');
}

buildAll().catch((err) => {
  console.error('❌ Build failed:', err);
  process.exit(1);
});
