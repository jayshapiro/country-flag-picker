# Country Flag Picker: live demo

The demo at [country-flag.jayshapiro.com](https://country-flag.jayshapiro.com), built from the skill's
own reference files. It is a Vite + React app served by a Cloudflare Worker, which also answers
`/api/geo/country` from `request.cf` (country, region, city).

## Run locally

```bash
npm install
npm run build
npx wrangler dev
```

Open http://localhost:8787. `wrangler dev` asks Cloudflare about your own connection, so the
prefilled country, region and city are real.

## Deploy your own copy

Set `account_id` and the `routes` pattern in `wrangler.jsonc` to your Cloudflare account and
domain (or delete `routes` to use a free `*.workers.dev` address), then:

```bash
npx wrangler login
npm run build && npx wrangler deploy
```
