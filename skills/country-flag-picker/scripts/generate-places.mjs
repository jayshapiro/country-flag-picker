// Regenerates reference/places/<cc>.json: every country's states/provinces and its cities.
//
//   curl -O https://download.geonames.org/export/dump/cities15000.zip && unzip cities15000.zip
//   curl -O https://download.geonames.org/export/dump/admin1CodesASCII.txt
//   node <skill>/scripts/generate-places.mjs cities15000.txt admin1CodesASCII.txt <skill>/reference/places
//
// Source: GeoNames (https://www.geonames.org), CC BY 4.0: credit "GeoNames" wherever the data is used.
//   cities15000.txt      every city with population > 15,000, plus capitals
//   admin1CodesASCII.txt first-level divisions (states, provinces, counties...) with English names
//
// Output, one file per ISO 3166-1 alpha-2 code (lowercase), only for countries that have data:
//   { "regions": [["05", "Nairobi Area"], ...],          // [admin1 code, name], sorted by name
//     "cities":  [["Nairobi", "05"], ...] }              // [name, admin1 code], sorted by name
// Region codes are GeoNames admin1 codes (mostly FIPS, ISO only for US, CH, BE, ME), so match
// Cloudflare's region to this list by NAME, not by code.

import fs from "node:fs";
import path from "node:path";

const [citiesFile, admin1File, outDir] = process.argv.slice(2);
if (!citiesFile || !admin1File || !outDir) {
  console.error("usage: node generate-places.mjs cities15000.txt admin1CodesASCII.txt <outDir>");
  process.exit(1);
}

const byCountry = new Map(); // cc -> { regions: Map<code, name>, cities: Map<"name|region", pop> }
const bucket = (cc) => {
  if (!byCountry.has(cc)) byCountry.set(cc, { regions: new Map(), cities: new Map() });
  return byCountry.get(cc);
};

// admin1CodesASCII: "KE.05<TAB>Nairobi Area<TAB>Nairobi Area<TAB>184742"
for (const line of fs.readFileSync(admin1File, "utf8").split("\n")) {
  const [key, name] = line.split("\t");
  if (!key || !name) continue;
  const [cc, code] = key.split(".");
  bucket(cc).regions.set(code, name);
}

// cities: 1 name, 8 country code, 10 admin1 code, 14 population
for (const line of fs.readFileSync(citiesFile, "utf8").split("\n")) {
  const f = line.split("\t");
  if (f.length < 15) continue;
  const [name, cc, admin1] = [f[1], f[8], f[10]];
  const b = bucket(cc);
  const region = b.regions.has(admin1) ? admin1 : ""; // "" = city not tied to a known region
  b.cities.set(`${name}|${region}`, Number(f[14]) || 0);
}

fs.mkdirSync(outDir, { recursive: true });
const byName = (a, b) => a.localeCompare(b, "en", { sensitivity: "base" });
let files = 0, bytes = 0;
for (const [cc, { regions, cities }] of byCountry) {
  const out = {
    regions: [...regions].sort((a, b) => byName(a[1], b[1])),
    cities: [...cities.keys()].map((k) => k.split("|")).sort((a, b) => byName(a[0], b[0])),
  };
  const json = JSON.stringify(out);
  fs.writeFileSync(path.join(outDir, `${cc.toLowerCase()}.json`), json);
  files++; bytes += json.length;
}
console.error(`wrote ${files} files, ${(bytes / 1024).toFixed(0)} KB total`);
