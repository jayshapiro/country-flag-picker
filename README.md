# Country Flag Picker: a Claude Code skill

A ready-made pattern for a smarter country field in web forms. Ask Claude Code for a country selector
or a phone-number-with-country-code field, and it builds this one: every country, a real flag,
the right dial code, and the visitor's country sniffed from their current IP address and already selected in the form.

**Live demo:** [country-flag.jayshapiro.com](https://country-flag.jayshapiro.com)

## What you get

- **Every country.** The full ISO 3166-1 country list: 250 official codes.
  The list is generated from maintained open-source data, not typed by hand.
- **Real flags on every platform, without the weight.** Each flag is a small SVG file (median
  0.6 KB) that loads only when it is on screen, so Windows users see a flag rather than two letters
  (which is what emoji flags turn into there). Flag packages that bundle every flag into your
  JavaScript add ~3.7 MB; this adds none.
- **Correct dial codes.** ITU calling codes from `libphonenumber-js`. Caribbean countries correctly
  use `+1`, not the `+1268`-style codes many hand-made lists get wrong.
- **Pre-filled Country.** The visitor's country is preselected based on their IP address, and never
  overwrites a value the user or your app already set. By default this uses Cloudflare's free
  edge geolocation, so there's no API key and no third-party lookup.
- **Clean data.** Only the two-letter ISO code (`KE`, `US`) is submitted/stored. Names, flags and dial codes
  are looked up from it, so the database never holds free-text country names keeping your data clean.
- **State/province and city fields** (optional) that follow the country. eg:Pick "Kenya" and you get
  Kenya's 47 counties, then only the cities in the county you chose. Every country with data is
  covered. Both fields are searchable with autocomplete text. The city field accepts towns that
  aren't listed, and both prefill from the visitor's location. Each country's list loads only
  when that country is chosen.
- **A phone-number field** built on the same list: flag + dial code on the left, digits on the
  right, joined into an international number on submit.

## Install

### From this repo (Claude Code)

```
/plugin marketplace add jayshapiro/country-flag-picker
/plugin install country-flag-picker@jayshapiro
```

### Manually

Copy the `skills/country-flag-picker` folder into `~/.claude/skills/` (all projects) or
`.claude/skills/` inside one project.

## Use

Just describe what you need. For example:

- "Add a country field to the signup form."
- "I need a WhatsApp number field with the country code."
- "Add nationality and country of residence to the profile page."
- "Add state and city fields under the country."
- "Use the flag + ISO code country picker."

Claude reads the skill and copies the reference files into your project, adjusting import paths
to fit.

## What's inside

```
skills/country-flag-picker/
├── SKILL.md                      instructions Claude follows
├── reference/
│   ├── countries.ts              the generated 250-country list + helpers
│   ├── CountryPhoneField.tsx     React country + phone field
│   ├── LocationFields.tsx        state/province + city fields that follow the country
│   ├── places.ts                 loads and filters a country's states and cities
│   ├── places/                   one file per country (copy into your public/ folder)
│   ├── Flag.tsx                  lightweight <Flag code="KE" /> component
│   ├── flags/                    250 SVG flags (copy into your public/ folder)
│   └── geo-worker.ts             Cloudflare Worker for the visitor's country, region and city
└── scripts/
    ├── generate-countries.mjs    rebuilds countries.ts from the source packages
    └── generate-places.mjs       rebuilds places/ from GeoNames

demo/                             the live demo: a Cloudflare Worker + Vite React app using the skill
```

**Tech stack of the reference component:** React, react-hook-form + zod, shadcn/ui on Base UI
(shadcn's current default), TanStack Query, lucide-react. On another stack, Claude keeps the data, flags and IP logic and swaps
the UI parts.

**Server side:** one small `/api/geo/country` endpoint. The skill covers four setups:

| Your hosting | How the location is found | Setup |
|---|---|---|
| Cloudflare Workers / Pages | `request.cf` (country, region, city) | none |
| Your own server behind Cloudflare's proxy | `CF-IPCountry` header (+ `cf-region`, `cf-ipcity`) | turn on IP Geolocation, or "Add visitor location headers" for region and city (all plans) |
| Anywhere else | a tiny free Worker on `workers.dev` (included) | a free Cloudflare account |
| No Cloudflare at all | a third-party IP lookup (fallback) | check its terms |

## Things to decide per project

The skill asks rather than assumes on these:

- **Hosting.** Which of the four geo setups above applies.
- **Strict ISO.** Kosovo (`XK`) is included but is not an official ISO code. Remove its row if
  you need strict ISO.
- **Long lists.** 250 countries is a long dropdown. The skill explains how to switch to a
  searchable one.

## Updating the data

Countries and dial codes:

```bash
npm i i18n-iso-countries libphonenumber-js
node skills/country-flag-picker/scripts/generate-countries.mjs > skills/country-flag-picker/reference/countries.ts
```

States, provinces and cities (GeoNames, cities over 15,000 people):

```bash
curl -O https://download.geonames.org/export/dump/cities15000.zip && unzip cities15000.zip
curl -O https://download.geonames.org/export/dump/admin1CodesASCII.txt
node skills/country-flag-picker/scripts/generate-places.mjs cities15000.txt admin1CodesASCII.txt skills/country-flag-picker/reference/places
```

## Credits

- Created by **Jay Shapiro**
  - GitHub: [@jayshapiro](https://github.com/jayshapiro)
  - LinkedIn: [linkedin.com/in/jayshapiro](https://www.linkedin.com/in/jayshapiro/)

  The pattern was created and shared for free by Jay Shapiro for his social impact #AIforGood projects, then generalised into this skill with [Claude Code](https://claude.com/claude-code).
- Country codes and names: [i18n-iso-countries](https://github.com/michaelwittig/node-i18n-iso-countries) (MIT)
- Dial codes: [libphonenumber-js](https://gitlab.com/catamphetamine/libphonenumber-js) (MIT), based on Google's libphonenumber
- Flag images: SVG files from [react-world-flags](https://github.com/smucode/react-world-flags) (MIT; licence in `reference/flags/`)
- States, provinces and cities: [GeoNames](https://www.geonames.org) ([CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)).
  If you use the state/city fields, credit GeoNames visibly in your app.

## License

[MIT](LICENSE) © 2026 Jay Shapiro
