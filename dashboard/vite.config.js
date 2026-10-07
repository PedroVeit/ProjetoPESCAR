import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" deixa o build funcionar em qualquer subcaminho (GitHub Pages,
// Vercel, abrir dist/ direto) sem reconfigurar.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
