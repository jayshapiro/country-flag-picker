// Cloudflare Worker for the country-flag-picker demo: serves the built React app (static assets)
// and GET /api/geo/country, using the skill's reference/geo-worker.ts unchanged.
import geo from "./geo-worker";

interface Env {
  ASSETS: Fetcher;
}

export default {
  async fetch(request, env): Promise<Response> {
    if (new URL(request.url).pathname === "/api/geo/country") return geo.fetch(request);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
