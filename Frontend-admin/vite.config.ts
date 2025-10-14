/// <reference types="vitest/config" />
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0', // Correctly allows access from outside the container/machine
    port: 5173,
    allowedHosts: ['.dpdns.org'], // Good security practice for tunneling
    hmr: {
      // This block is perfectly configured for Cloudflare Tunnels
      protocol: 'wss',
      host: 'quizdash.dpdns.org',
      clientPort: 443,
    }
  },
  assetsInclude: ['/*.html'],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});