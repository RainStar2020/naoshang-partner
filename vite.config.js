import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [uni()],
  server: {
    host: "0.0.0.0",
    // Windows sleep / idle can drop native FS watchers and HMR reconnects;
    // polling avoids transient ENOENT overlays after the machine wakes.
    watch: {
      usePolling: true,
      interval: 1000,
    },
    hmr: {
      overlay: true,
    },
    proxy: {
      "/backend-api": {
        target: "http://192.168.0.44:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/backend-api/, ""),
      },
      "/hq-api": {
        // Direct backend HQ API; same host as backend-api, not the HQ admin Vite proxy.
        target: "http://192.168.0.44:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/hq-api/, "/api/hq"),
      },
    },
  },
});
