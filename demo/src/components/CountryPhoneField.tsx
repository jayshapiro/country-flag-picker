// Reference implementation of the country + phone field (the pattern this skill documents).
// Stack: React + react-hook-form + zod + shadcn/ui on the Base UI base (shadcn's current default:
//        Select, Input, Label) + @tanstack/react-query. Flags come from ./Flag (self-hosted SVGs).
// Uses react-hook-form's Controller directly; shadcn no longer ships a `form` component.
// Adapt import paths (@/components/..., @shared/countries) to the target project.

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Controller, type UseFormReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Phone } from "lucide-react";
import Flag from "@/components/Flag";
import { phoneCountries as countries, type Country } from "@shared/countries";

// ---- zod fields (merge into the form schema) ----
// countryCode: z.string().min(1, "Please select a country"),
// phoneNumber: z.string()
//   .min(5, "Phone number must be at least 5 digits")
//   .max(20, "Phone number must be less than 20 characters")
//   .regex(/^[0-9\s\-()]+$/, "Please enter a valid phone number (digits only, no country code)"),

type Fields = { countryCode: string; phoneNumber: string };

/** Shape returned by GET /api/geo/country (see geo-worker.ts). region/city feed LocationFields. */
export type GeoResponse = { countryCode: string | null; region?: string | null; city?: string | null };

/** Set this to the geo Worker's full URL when using SKILL.md option C (site not on Cloudflare). */
const GEO_URL = "/api/geo/country";

export function useCountrySelection(form: UseFormReturn<any>, prefillCountryCode?: string) {
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const { data: geoData, isLoading: geoLoading } = useQuery<GeoResponse>({
    queryKey: [GEO_URL],
    queryFn: async () => {
      const r = await fetch(GEO_URL);
      return r.ok ? r.json() : { countryCode: null };
    },
    staleTime: Infinity,
    retry: false,
  });

  // Priority: explicit prefill > IP geo > nothing. Never overwrite a value already chosen.
  useEffect(() => {
    if (!prefillCountryCode) return;
    const c = countries.find((x) => x.code === prefillCountryCode);
    if (c) { form.setValue("countryCode", c.code); setSelectedCountry(c); }
  }, [prefillCountryCode, form]);

  useEffect(() => {
    if (geoData?.countryCode && !form.getValues("countryCode") && !prefillCountryCode) {
      const c = countries.find((x) => x.code === geoData.countryCode);
      if (c) { form.setValue("countryCode", c.code); setSelectedCountry(c); }
    }
  }, [geoData, prefillCountryCode, form]);

  const handleCountryChange = (code: string | null) => {
    const c = code ? countries.find((x) => x.code === code) : undefined;
    if (c) {
      setSelectedCountry(c);
      form.setValue("countryCode", c.code, { shouldValidate: true });
      // If the form has a dependent state/province field, reset it here:
      // form.setValue("stateProvince", "");
    }
  };

  return { selectedCountry, geoLoading, geo: geoData ?? null, geoCountryCode: geoData?.countryCode ?? null, handleCountryChange };
}

// Build the E.164 number on submit: dial code + digits only.
export function toFullPhoneNumber(data: Fields): string {
  const c = countries.find((x) => x.code === data.countryCode);
  const digits = data.phoneNumber.replace(/\D/g, "");
  return (c ? `${c.dialCode}${digits}` : digits).trim();
}

export function CountryPhoneField({
  form,
  selectedCountry,
  geoLoading,
  handleCountryChange,
  label = "WhatsApp Phone Number",
}: {
  form: UseFormReturn<any>;
  selectedCountry: Country | null;
  geoLoading: boolean;
  handleCountryChange: (code: string | null) => void;
  label?: string;
}) {
  const errors = form.formState.errors;
  const error = (errors.countryCode?.message ?? errors.phoneNumber?.message) as string | undefined;

  return (
    <div className="grid gap-2">
      <Label htmlFor="phoneNumber" className="flex items-center gap-2">
        <Phone className="w-4 h-4" />
        {label}
      </Label>
      <div className="flex gap-2">
        <Controller
          control={form.control}
          name="countryCode"
          render={({ field }) => (
            <div className="w-[140px] flex-shrink-0">
              {/* Base UI: value is null (not "") when empty, and onValueChange can pass null. */}
              <Select value={field.value || null} onValueChange={handleCountryChange} disabled={geoLoading}>
                <SelectTrigger className="w-full" aria-label="Country code" aria-invalid={!!errors.countryCode} data-testid="select-country-code">
                  {/* Closed state: flag + dial code only. A render function overrides `placeholder`,
                      so it draws the placeholder itself. */}
                  <SelectValue>
                    {() =>
                      selectedCountry ? (
                        <span className="flex items-center gap-2">
                          <Flag code={selectedCountry.code} className="w-5 h-4 object-cover rounded-sm" />
                          <span>{selectedCountry.dialCode}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">{geoLoading ? "Loading..." : "Country"}</span>
                      )
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px] min-w-64" alignItemWithTrigger={false}>
                  {/* Open state: flag + full name + dial code right-aligned. alignItemWithTrigger={false}
                      opens it below the field; the Base UI default mis-places a long, height-capped list.
                      `label` drives keyboard type-ahead ("ke" -> Kenya). */}
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code} label={country.name} data-testid={`option-country-${country.code}`}>
                      <Flag code={country.code} className="w-5 h-4 object-cover rounded-sm" />
                      <span className="truncate">{country.name}</span>
                      <span className="text-muted-foreground ml-auto">{country.dialCode}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        />
        <Controller
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <Input
              {...field}
              id="phoneNumber"
              placeholder="712 345 678"
              className="flex-1"
              autoComplete="tel-national"
              type="tel"
              aria-invalid={!!errors.phoneNumber}
              data-testid="input-phone-number"
            />
          )}
        />
      </div>
      <p className="text-muted-foreground text-sm">
        Select your country and enter your phone number without the country code
      </p>
      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
}
