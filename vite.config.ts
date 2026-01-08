
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/My-Helper/",

  define: {
    // Only needed if you REALLY want to inject a build-time key (not recommended for public sites)
    "process.env.API_KEY": JSON.stringify(process.env.API_KEY),
  },

  build: {
    sourcemap: false,
    minify: "esbuild",
  },
});
