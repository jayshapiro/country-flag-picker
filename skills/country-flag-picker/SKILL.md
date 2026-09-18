---
name: country-flag-picker
description: Production-tested pattern for collecting a user's country in a web form — full ISO 3166-1 alpha-2 list (generated, 250 entries), the ISO code as the stored value, SVG flag + name + dial code in the dropdown, flag + dial code in the closed trigger, auto-preselected from the visitor's IP via Cloudflare, plus optional state/province and city fields filtered by the chosen country (GeoNames data for every country) and prefilled from the visitor's location. Use when a form needs a country field, a phone number with country code, a WhatsApp number field, a nationality / country-of-residence / current-location selector, or state/province and city fields, or when asked for "the flag + ISO code country picker".
license: MIT
metadata:
  author: Jay Shapiro
  version: 1.0.0
---

# Country picker: ISO code + flag

This pattern first shipped in a production onboarding form. The
`reference/` folder holds everything needed to reproduce it. Copy from there rather than retyping.

## The pattern in one paragraph

Store **only the ISO 3166-1 alpha-2 code** (`"KE"`, `"US"`) in the form and the database. Everything
shown to the user (flag, name, dial code) is derived from that code through one shared `countries`
array that both client and server can import. Render the flag with the bundled `<Flag code="KE" />`,
a plain `<img>` of a self-hosted SVG. It looks the same on Windows, where emoji flags render as two
letters, and it loads only when on screen. On load, ask the server for the visitor's country from their IP and
preselect it, unless a prefill value exists or the user already picked one. When the field is a
phone number, the select sits left of a digits-only input and the full number is
`dialCode + digits` at submit.

## Files to drop into a project

| From `reference/` | Put at | Notes |
|---|---|---|
| `countries.ts` | `shared/countries.ts` (or `src/lib/countries.ts`) | **Full ISO 3166-1 set, generated** (see below). `countries` (all 250), `phoneCountries` (243 with a calling code), `getCountryByCode`, `getCountriesByDialCode` |
| `places.ts` | `lib/places.ts` | `usePlaces(cc)` loads one country's states + cities; `findRegion`, `cityNames`, `regionNames` |
| `places/` | the app's `public/places/` | 246 generated files, one per country (724 KB in all; India, the largest, is 70 KB). Only needed with `LocationFields` |
| `LocationFields.tsx` | components folder | state/province + city fields that follow the selected country (see below) |
| `Flag.tsx` | `components/Flag.tsx` | `<Flag code="KE" />`: an `<img>` of `/flags/ke.svg`, lazy-loaded |
| `flags/` | the app's `public/flags/` | 250 SVGs, one per code, plus their MIT licence. Keep the licence file with them |
| `CountryPhoneField.tsx` | components folder | `useCountrySelection` hook + `CountryPhoneField` + `toFullPhoneNumber` |
| `geo-worker.ts` | a Cloudflare Worker | the `/api/geo/country` handler for geo options A and C |

No flag package: flags are static files. The component assumes shadcn/ui on its default **Base UI**
base (`npx shadcn@latest init -b base`; `add select input label`), `react-hook-form` + `zod`,
`@tanstack/react-query`, and `lucide-react`. It does not use shadcn's `form` component, which
current shadcn no longer ships. On a different stack, keep the data file, the flags and the geo
logic, and swap the UI primitives.

Why not the `react-world-flags` package: it inlines every flag into the JavaScript bundle, about
3.7 MB (1.4 MB gzipped), downloaded before the form renders. The bundled files are the same SVGs,
served one at a time (median 0.6 KB).

## UI details worth keeping

- Closed trigger: flag (`w-5 h-4 object-cover rounded-sm`) + dial code only. The select is fixed at
  `w-[140px] flex-shrink-0`; the number input takes `flex-1`.
- Open list: flag, `truncate` country name, dial code `ml-auto text-muted-foreground`;
  `max-h-[300px] min-w-64` on the content, so names are not squeezed to the trigger's width.
- While the geo lookup is in flight the select is disabled with placeholder "Loading...".
- Phone input: `type="tel"`, `autoComplete="tel-national"`, helper text "enter your phone number
  without the country code". zod regex `^[0-9\s\-()]+$`, 5-20 chars.
- Changing country resets any dependent `stateProvince` value.
- `data-testid="select-country-code"` / `option-country-{CODE}` for tests.

### Base UI `Select` specifics (all tested)

- **Empty value is `null`, not `""`.** Pass `value={field.value || null}`; `onValueChange` can be
  called with `null`, so guard it.
- **Trigger content is a render function.** `<SelectValue>{() => …}</SelectValue>`. A function
  child overrides the `placeholder` prop, so it must draw the placeholder itself.
- **Set `alignItemWithTrigger={false}` on `SelectContent`.** The default positions the list so the
  selected item sits over the trigger. With 250 items and a height cap, that throws the list to the
  top of the page, away from the field.
- **Give each `SelectItem` a `label={name}`** so keyboard type-ahead matches the country name
  ("ke" jumps to Kenya) rather than the item's text including the dial code.

## State/province and city (optional)

`LocationFields` adds two linked fields under a country field:

- **State / province:** a searchable Base UI `Combobox` of that country's first-level divisions
  (states, provinces, counties, regions...). Every country with data gets a list, not a
  hand-picked few. The value must come from the list. Territories without divisions get a plain
  text box.
- **City or town:** a searchable Base UI `Autocomplete`, narrowed to the chosen state/province (or
  the whole country if none is chosen). The list holds cities over 15,000 people, so a typed town
  that isn't listed is kept as the value.
- **Following the country:** changing the country clears both fields and loads that country's
  file (`/places/<cc>.json`, fetched once, then cached). Choosing a new state clears the city.
- **Prefill:** if the chosen country is the visitor's own, the region and city from the geo
  endpoint fill the fields, but only if they are still empty. The region is matched to the list
  **by name** (`findRegion`: accents, case and words like "County", "Province" or "State" are
  ignored; "Nairobi County" matches "Nairobi Area"), and only used when exactly one entry matches.
  Otherwise the field stays empty. It's never guessed.
- **Stored values:** the region and city **names**, as the user sees them.

Gotchas (all hit while building this):
- **Use `Autocomplete`, not `Combobox`, for free text.** A `Combobox` resets its text to the
  selected item when it closes, which silently wipes a town the user typed that isn't in the list.
  Base UI's `Autocomplete` treats the text as the value. shadcn has no autocomplete wrapper, but
  `Autocomplete` reuses the Combobox input/list/popup parts, so shadcn's `ComboboxInput`,
  `ComboboxContent`, `ComboboxList` and `ComboboxEmpty` work inside `Autocomplete.Root`. Only
  `Root` and `Item` come from `@base-ui/react/autocomplete`.
- **GeoNames region codes are mostly FIPS, not ISO 3166-2** (ISO only for US, CH, BE, ME), while
  Cloudflare reports ISO. Match on names, never codes.
- **Data quality is "as is".** Some cities sit in a neighbouring division (for example, Thika is
  listed under Nairobi County, though it's in Kiambu County). IP-based region and city are
  approximate too, often the ISP's hub city. Both are suggestions the user can change.

**Data:** [GeoNames](https://www.geonames.org), **CC BY 4.0**. The app must credit GeoNames
somewhere visible, such as the footer or an about page. Rebuild the files with
`scripts/generate-places.mjs` (instructions at its top). Built 2026-09-18 from `cities15000` (all
cities over 15,000 people, plus capitals) and `admin1CodesASCII`. There are no files for AQ, BV,
HM and IO, which have no cities; the fields fall back to plain text there.

## Prefill priority

1. Explicit prefill (e.g. a returning session's saved `countryCode`)
2. IP geolocation from `/api/geo/country` (Cloudflare by default; see below)
3. Empty: the user must choose (`z.string().min(1, "Please select a country")`)

Geo never overwrites a value already set.

## Geo prefill endpoint: Cloudflare by default

The client calls `GET /api/geo/country` and expects
`{ "countryCode": "KE", "region": "Nairobi County", "city": "Nairobi" }`, where any field may be
`null`. `region` and `city` only feed the optional state/city prefill; a country-only response
works. Pick the first option that fits how the project is hosted. **Ask the user which applies.
Don't guess.**

In every option, treat Cloudflare's special values as "unknown": `XX` (no country data) and `T1`
(Tor). Return `null` for them. Mark the response `Cache-Control: private, no-store` because it
differs per visitor.

### A. Site runs on Cloudflare Workers (recommended, zero setup)

`request.cf.country`, `.region` and `.city` are filled in by Cloudflare's edge on every plan. There's no API key, no
external call and no dashboard setting. `reference/geo-worker.ts` is the complete handler; for a
Worker that also serves the app, route `/api/geo/country` to it before static assets
(`"run_worker_first": ["/api/*"]` in `wrangler.jsonc`). Pages Functions get the same
`request.cf` object.

### B. Own server (Express, Next.js, etc.) behind Cloudflare's proxy

Read the `CF-IPCountry` request header. Requirements:
- The hostname must be **proxied** through Cloudflare (orange cloud). That normally means the
  domain's DNS is on Cloudflare. Keeping DNS elsewhere needs a partial (CNAME) setup, which is
  Business/Enterprise only.
- For country only, turn on **IP Geolocation** (dashboard: Network). For region and city too,
  turn on the **Add visitor location headers** Managed Transform instead, which adds `cf-region`
  and `cf-ipcity` as well. Both are available on every plan. Check which is on; don't assume.

```ts
app.get("/api/geo/country", (req, res) => {
  const c = req.header("cf-ipcountry");
  const countryCode = c && c !== "XX" && c !== "T1" ? c : null;
  res.set("Cache-Control", "private, no-store");
  res.json({
    countryCode,
    region: countryCode ? req.header("cf-region") || null : null,
    city: countryCode ? req.header("cf-ipcity") || null : null,
  });
});
```

Next.js route handler: the same logic, reading the headers from `await headers()`.

### C. Site hosted anywhere, not on Cloudflare

Deploy `reference/geo-worker.ts` on its own as a tiny Worker on a free `*.workers.dev` subdomain.
This needs a free Cloudflare account, but not the site's domain or DNS. The browser calls it
directly, so Cloudflare sees the visitor's own IP; the Worker sends
`Access-Control-Allow-Origin: *`. Point the client's `fetch` at the Worker's URL instead of
`/api/geo/country`. Tighten the CORS origin to the site's domain if the user wants.

### D. No Cloudflare at all (fallback)

A server-side IP lookup service. Example with ip-api.com. Its free endpoint is plain HTTP and
**for non-commercial use only**, so raise that with the user for any commercial product.

```ts
app.get("/api/geo/country", rateLimiter, async (req, res) => {
  const xff = req.headers["x-forwarded-for"];
  const ip = (typeof xff === "string" ? xff.split(",")[0].trim() : req.ip ?? "").replace(/^::ffff:/, "");
  res.set("Cache-Control", "private, no-store");
  try {
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,countryCode,regionName,city`);
    const d = await r.json();
    const ok = d.status === "success";
    res.json({ countryCode: ok ? d.countryCode : null, region: ok ? d.regionName : null, city: ok ? d.city : null });
  } catch { res.json({ countryCode: null, region: null, city: null }); }  // never error to the client
});
```

Behind nginx, pass `X-Forwarded-For` through, or every visitor resolves to the proxy's IP. Keep
a rate limiter on this one, since it spends a third-party quota.

## The country list (full ISO set, generated)

`reference/countries.ts` is **generated**, not hand-maintained. Don't edit it by hand; re-run
`scripts/generate-countries.mjs` (instructions at the top of the script). Built 2026-09-18 from
`i18n-iso-countries@7.14.0` + `libphonenumber-js@1.13.13`:

- **Codes:** all 249 officially assigned ISO 3166-1 alpha-2 codes, plus `XK` (Kosovo). `XK` is
  user-assigned, not official ISO; delete its row if a project must be strictly ISO.
- **Dial codes:** the ITU calling code from libphonenumber. 7 territories have none (`AQ BV GS HM
  PN TF UM`), so their `dialCode` is `""`. Use `phoneCountries` for phone pickers and `countries`
  for a plain country / nationality field.
- **Names:** English names from `Intl.DisplayNames`, with `&`→`and` and `St.`→`Saint`, plus a
  small override map for common usage ("Ivory Coast", "Congo (DRC)", "Turkey", "Czech Republic").
- **Flags:** `reference/flags/` has an SVG for every one of the 250 codes (checked). They come from
  `react-world-flags@1.6.0` (MIT).

### Dial codes for NANP countries are `+1`

Caribbean members of the North American Numbering Plan (AG BS BB DM DO GD JM PR KN LC VC TT, and
the territories) all have calling code `+1`. Hand-made lists often give them 4-digit codes such as
`+1268` or `+1809`. Don't: those are `+1` plus an area code, and they break for countries with
more than one area code (DO also uses 829/849, JM 658, PR 939). With `+1`, users type the full
10-digit national number and `dialCode + digits` is a correct E.164 number. Likewise `VA` is `+39`,
not `+379` (assigned but never brought into use).

Calling codes are not unique (`+1` covers 25 NANP members; `+7` covers RU and KZ), so the helper is
`getCountriesByDialCode` (plural), and there is no single-result lookup.

For real phone parsing and validation (not just joining strings), use `libphonenumber-js`'s
`parsePhoneNumber(digits, countryCode).isValid()` rather than tightening the regex.

With 243–250 entries a plain `Select` gets long. If a project needs it, swap to a searchable
combobox (shadcn `add combobox`, built on Base UI's Combobox) and filter on name, code and dial
code.

## How to apply

1. Copy the `reference/` files into the project (adjust import aliases), and `reference/flags/`
   into `public/flags/`.
2. Add `countryCode` (and the phone field if relevant) to the zod schema.
3. Add the geo endpoint using option A, B, C or D above (ask which fits the hosting).
4. Wire `useCountrySelection(form, prefill?.countryCode)` + `<CountryPhoneField …/>`. For a plain
   country field (no phone), reuse the same `Select` with `countries` and show the name next to the
   flag in the trigger instead of the dial code.
5. If state/province and city are wanted: copy `reference/places/` into `public/places/`, run
   `npx shadcn@latest add combobox`, add `stateProvince` and `city` to the schema, and render
   `<LocationFields form={form} countryCode={theCountryField} geo={geo} />` (`geo` comes from
   `useCountrySelection`). Add a visible "GeoNames" credit (CC BY 4.0).
6. Persist `countryCode` (ISO-2), never the display name.
