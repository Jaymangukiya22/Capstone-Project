/// <reference types="vitest/config" />
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Dynamic configuration based on environment
const isDevelopment = process.env.NODE_ENV !== 'production';
const isCloudflareHosted = process.env.VITE_CLOUDFLARE_HOSTED === 'true';
const isNetworkMode = process.env.VITE_NETWORK_MODE === 'true';
const networkIP = process.env.VITE_NETWORK_IP || 'localhost';

// HMR configuration - supports localhost, network, and hosted environments
const getHMRConfig = () => {
  if (isCloudflareHosted || process.env.VITE_USE_PRODUCTION_HMR === 'true') {
    // Production/Hosted configuration
    return {
      protocol: 'wss' as const,
      host: 'quizdash.dpdns.org',
      clientPort: 443,
    };
  } else if (isNetworkMode) {
    // Network access configuration
    return {
      protocol: 'ws' as const,
      host: networkIP,
      port: 5173,
    };
  } else {
    // Local development configuration - disable HMR in Docker to avoid connection issues
    // Browser will use the current URL for HMR connection
    return false;
  }
};

console.log('🔧 Vite Config - Environment:', {
  isDevelopment,
  isCloudflareHosted,
  hmrConfig: getHMRConfig()
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable React Fast Refresh
      fastRefresh: true,
      // Use automatic JSX runtime
      jsxRuntime: 'automatic',
    }),
    tailwindcss()
  ],
  
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Dynamic HMR configuration based on environment
    hmr: getHMRConfig(),
    // Allow connections from production domain
    allowedHosts: ['.dpdns.org', 'localhost', '127.0.0.1'],
  },
  
  build: {
    // Output directory
    outDir: 'dist',
    
    // Enable source maps for production debugging (disable for smaller bundle)
    sourcemap: false,
    
    // Minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remove console.logs in production
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      },
    },
    
    // Chunk size warnings
    chunkSizeWarningLimit: 1000,
    
    // Rollup options for code splitting
    rollupOptions: {
      output: {
        // Manual chunks for better caching
        manualChunks: {
          // React core
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          
          // UI components
          'ui-vendor': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-select',
            '@radix-ui/react-slot',
            '@radix-ui/react-tabs',
            'lucide-react',
          ],
          
          // Utilities
          'utils-vendor': [
            'axios',
            'clsx',
            'tailwind-merge',
            'class-variance-authority',
          ],
          
          // Heavy libraries
          'excel-vendor': ['xlsx', 'papaparse'],
          'socket-vendor': ['socket.io-client'],
          'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
        },
        
        // Asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          let extType = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|webp|avif)$/.test(assetInfo.name)) {
            extType = 'images';
          } else if (/\.(woff2?|ttf|otf|eot)$/.test(assetInfo.name)) {
            extType = 'fonts';
          }
          return `assets/${extType}/[name]-[hash][extname]`;
        },
        
        // Chunk file names
        chunkFileNames: 'assets/js/[name]-[hash].js',
        
        // Entry file names
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    
    // Asset handling
    assetsInlineLimit: 4096, // 4kb - inline smaller assets as base64
    
    // CSS code splitting
    cssCodeSplit: true,
    
    // Report compressed size
    reportCompressedSize: false, // Faster builds
    
    // Target modern browsers
    target: 'esnext',
  },
  
  // Optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'axios',
      'socket.io-client',
    ],
    exclude: ['@vitest/browser'],
  },
  
  assetsInclude: ['/*.html'],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  
  // Preview server config
  preview: {
    port: 5173,
    host: '0.0.0.0',
  },
});