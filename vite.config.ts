import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

function apiMiddleware(): Plugin {
  return {
    name: "signaledge-api-middleware",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) {
          return next();
        }
        try {
          // Lazy-load the handler so it picks up env vars at request time
          const { handleApiRequest } = await import("./src/lib/api-handler");
          const webReq = new Request(`http://localhost${req.url}`, {
            method: req.method,
            headers: req.headers as Record<string, string>,
          });
          const apiRes = await handleApiRequest(webReq);
          if (apiRes) {
            res.statusCode = apiRes.status;
            for (const [k, v] of apiRes.headers.entries()) {
              res.setHeader(k, v);
            }
            const body = await apiRes.text();
            res.end(body);
            return;
          }
        } catch (err) {
          console.error("[api-middleware] Error:", err);
        }
        next();
      });
    },
  };
}

export default defineConfig({
  server: {
    port: 3000,
    host: true,
    // The site is reverse-proxied behind <label>.<PUBLIC_SITE_DOMAIN>; the proxy
    // masks the Host to localhost:3000, but accept any host so a dev server never
    // rejects a proxied request with "Blocked request".
    allowedHosts: true,
  },
  plugins: [
    tailwindcss(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    apiMiddleware(),
    tanstackStart(),
    viteReact(),
  ],
});
