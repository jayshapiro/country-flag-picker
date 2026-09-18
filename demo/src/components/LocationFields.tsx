// State/province + city fields that follow the selected country.
// - Both lists load from /places/<cc>.json when the country is chosen (see places.ts).
// - The city list narrows to the chosen state/province; with none chosen it shows the whole country.
// - Typing filters both lists. Region must be picked from the list; city also accepts a town that
//   isn't listed (the list only has cities over 15,000 people).
// - Prefill: when the country is the visitor's own (per the geo endpoint), the region and city
//   Cloudflare reports are filled in, if the fields are still empty. Region only when it matches a
//   list entry cleanly; never guessed.
// Stack: shadcn/ui on Base UI (Combobox, Input, Label) + react-hook-form. Stores names, not codes.

import { useEffect, useRef } from "react";
import { Autocomplete } from "@base-ui/react/autocomplete";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Map as MapIcon, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList,
} from "@/components/ui/combobox";
import { cityNames, findRegion, regionNames, usePlaces } from "@/lib/places";

/** What the geo endpoint returns (see geo-worker.ts). */
export type GeoLocation = { countryCode: string | null; region?: string | null; city?: string | null };

export function LocationFields({
  form,
  countryCode,
  geo,
  regionField = "stateProvince",
  cityField = "city",
}: {
  form: UseFormReturn<any>;
  /** ISO code of the country these fields belong to. */
  countryCode: string | null | undefined;
  geo?: GeoLocation | null;
  regionField?: string;
  cityField?: string;
}) {
  const { data: places, isLoading } = usePlaces(countryCode);
  const region: string = form.watch(regionField) ?? "";
  const regions = regionNames(places);
  const cities = cityNames(places, region);
  const errors = form.formState.errors;

  // Changing country clears both fields (skip the first run so saved values survive a reload).
  const lastCountry = useRef(countryCode);
  useEffect(() => {
    if (lastCountry.current !== countryCode) {
      form.setValue(regionField, "");
      form.setValue(cityField, "");
      lastCountry.current = countryCode;
    }
  }, [countryCode, form, regionField, cityField]);

  // Prefill from Cloudflare once per country, only into empty fields.
  const prefilledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!places || !countryCode || !geo || geo.countryCode !== countryCode) return;
    if (prefilledFor.current === countryCode) return;
    prefilledFor.current = countryCode;
    const match = findRegion(places, geo.region);
    if (match && !form.getValues(regionField)) form.setValue(regionField, match[1]);
    if (geo.city && !form.getValues(cityField)) form.setValue(cityField, geo.city);
  }, [places, countryCode, geo, form, regionField, cityField]);

  const disabled = !countryCode || isLoading;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid gap-2">
        <Label htmlFor={regionField} className="flex items-center gap-2">
          <MapIcon className="h-4 w-4" /> State / province
        </Label>
        <Controller
          control={form.control}
          name={regionField}
          render={({ field }) =>
            regions.length > 0 ? (
              <Combobox
                items={regions}
                openOnInputClick
                value={field.value || null}
                onValueChange={(v) => {
                  field.onChange(v ?? "");
                  form.setValue(cityField, ""); // a new region means a new city list
                }}
              >
                <ComboboxInput id={regionField} placeholder="Type to search…" disabled={disabled} data-testid="combobox-region" />
                <ComboboxContent>
                  <ComboboxEmpty>No match</ComboboxEmpty>
                  <ComboboxList>
                    {(item: string) => <ComboboxItem key={item} value={item}>{item}</ComboboxItem>}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            ) : (
              // No list for this country (tiny territories): plain text.
              <Input id={regionField} {...field} disabled={!countryCode} data-testid="input-region" />
            )
          }
        />
        {errors[regionField] && <p className="text-destructive text-sm">{String(errors[regionField]?.message)}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor={cityField} className="flex items-center gap-2">
          <Building2 className="h-4 w-4" /> City or town
        </Label>
        <Controller
          control={form.control}
          name={cityField}
          render={({ field }) =>
            cities.length > 0 ? (
              // Base UI Autocomplete, not Combobox: its value IS the typed text, so a town that
              // isn't listed survives closing the list. (A Combobox resets the text to its selected
              // item on close, which wipes an unlisted town.) It reuses the Combobox input/list
              // parts, so shadcn's combobox styling applies; only Root and Item are its own.
              <Autocomplete.Root
                items={cities}
                value={field.value ?? ""}
                onValueChange={(v) => field.onChange(v)}
                openOnInputClick
                limit={100}
              >
                <ComboboxInput id={cityField} placeholder="Type to search…" disabled={disabled} showTrigger={false} data-testid="combobox-city" />
                <ComboboxContent>
                  <ComboboxEmpty>Not in the list. What you typed will be used.</ComboboxEmpty>
                  <ComboboxList>
                    {(item: string) => (
                      <Autocomplete.Item
                        key={item}
                        value={item}
                        className="relative flex w-full cursor-default items-center rounded-md px-1.5 py-1 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground"
                      >
                        {item}
                      </Autocomplete.Item>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Autocomplete.Root>
            ) : (
              <Input id={cityField} {...field} disabled={!countryCode} data-testid="input-city" />
            )
          }
        />
        {errors[cityField] && <p className="text-destructive text-sm">{String(errors[cityField]?.message)}</p>}
      </div>
    </div>
  );
}
