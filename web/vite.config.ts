// web/vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Neden: Vite preview, dış hostları bloklar. Railway domainine izin veriyoruz.
// Güvenli ve basit: allowedHosts=true -> tüm hostlara izin (sadece preview'da).
export default defineConfig(() => ({
  plugins: [react()],
  server: {
    host: true,             // local dev: 0.0.0.0 dinle
    port: 5173
  },
  preview: {
    host: true,             // prod preview: 0.0.0.0 dinle
    port: Number(process.env.PORT) || 4173,
    allowedHosts: true      // Railway domainini bloklama
    // İstersen sabitle: allowedHosts: ["frontend-production-de9f.up.railway.app"]
  }
}));
