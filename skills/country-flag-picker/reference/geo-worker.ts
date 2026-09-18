// Cloudflare Worker: the visitor's country, region and city from Cloudflare's edge.
//
//   GET /api/geo/country  ->  { "countryCode": "KE", "region": "Nairobi County", "city": "Nairobi" }
//                             (any field is null when Cloudflare can't tell)
//
// Option A (site on Workers): merge this route into the site's Worker, ahead of static assets.
// Option C (site hosted elsewhere): deploy this file on its own to a free *.workers.dev subdomain
//   and point the client's fetch at it. CORS is open; set ALLOW_ORIGIN to your site to tighten it.
//
// request.cf is populated on every Cloudflare plan: no API key, no external lookup.
// Region and city come from IP geolocation, so treat them as a suggestion the user can change.

const ALLOW_ORIGIN = "*";

// "XX" = no country data for this IP, "T1" = Tor exit node. Neither is a real country.
const NOT_A_COUNTRY = new Set(["XX", "T1"]);

const cors = {
  "Access-Control-Allow-Origin": ALLOW_ORIGIN,
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export function geoFromRequest(request: Request) {
  const cf = request.cf ?? {};
  const raw = (cf.country as string | undefined) ?? null;
  const countryCode = raw && !NOT_A_COUNTRY.has(raw) ? raw : null;
  return {
    countryCode,
    region: countryCode ? ((cf.region as string | undefined) || null) : null,
    city: countryCode ? ((cf.city as string | undefined) || null) : null,
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/api/geo/country") return new Response("Not found", { status: 404 });
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    return Response.json(geoFromRequest(request), {
      headers: { ...cors, "Cache-Control": "private, no-store" }, // per visitor, never cache
    });
  },
} satisfies ExportedHandler;
