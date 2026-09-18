import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Flag from "@/components/Flag";
import { Globe, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CountryPhoneField, toFullPhoneNumber, useCountrySelection } from "@/components/CountryPhoneField";
import { countries, getCountryByCode } from "@shared/countries";
import { LocationFields } from "@/components/LocationFields";

const REPO_URL = "https://github.com/jayshapiro/country-flag-picker";

const schema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name"),
  countryCode: z.string().min(1, "Please select a country"),
  phoneNumber: z
    .string()
    .min(5, "Phone number must be at least 5 digits")
    .max(20, "Phone number must be less than 20 characters")
    .regex(/^[0-9\s\-()]+$/, "Please enter a valid phone number (digits only, no country code)"),
  currentLocationCode: z.string().min(1, "Please select a country"),
  stateProvince: z.string().optional(),
  city: z.string().trim().min(2, "Please enter your city or town"),
});
type FormData = z.infer<typeof schema>;

type Stored = { fullName: string; phone: string; phoneCountry: string; currentLocation: string; stateProvince: string | null; city: string };

export default function App() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", countryCode: "", phoneNumber: "", currentLocationCode: "", stateProvince: "", city: "" },
  });
  const { selectedCountry, geoLoading, geo, geoCountryCode, handleCountryChange } = useCountrySelection(form);
  const [stored, setStored] = useState<Stored | null>(null);

  const currentLocationCode = form.watch("currentLocationCode");
  const currentLocation = getCountryByCode(currentLocationCode);
  const detected = geoCountryCode ? getCountryByCode(geoCountryCode) : undefined;

  // Same prefill rule for the current-location field: geo fills it only if it is still empty.
  useEffect(() => {
    if (geoCountryCode && !form.getValues("currentLocationCode") && getCountryByCode(geoCountryCode)) {
      form.setValue("currentLocationCode", geoCountryCode);
    }
  }, [geoCountryCode, form]);

  const onSubmit = (data: FormData) =>
    setStored({
      fullName: data.fullName.trim(),
      phone: toFullPhoneNumber(data),
      phoneCountry: data.countryCode,
      currentLocation: data.currentLocationCode,
      stateProvince: data.stateProvince?.trim() || null,
      city: data.city.trim(),
    });

  const errors = form.formState.errors;

  return (
    <main className="min-h-svh bg-muted/40 px-4 py-10">
      <div className="mx-auto grid max-w-xl gap-6">
        <header className="grid gap-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Country Flag Picker</h1>
          <p className="text-muted-foreground">
            A live demo of the Claude Code skill: every ISO country, real flags, correct dial codes,
            and your country preselected by Cloudflare.
          </p>
        </header>

        <div className="flex items-center justify-center gap-2 rounded-lg border bg-background px-4 py-3 text-sm" data-testid="geo-banner">
          <Globe className="h-4 w-4 text-muted-foreground" />
          {geoLoading ? (
            <span>Asking Cloudflare where you are…</span>
          ) : detected ? (
            <span className="flex flex-wrap items-center gap-2">
              Cloudflare places you in
              <Flag code={detected.code} className="h-4 w-5 rounded-sm object-cover" />
              <strong>{detected.name}</strong>
              <code className="text-muted-foreground">({detected.code})</code>
            </span>
          ) : (
            <span>Cloudflare couldn't tell your country, so nothing is preselected.</span>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign-up form</CardTitle>
            <CardDescription>Try changing the countries. Nothing you type leaves your browser.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-6" noValidate>
              <div className="grid gap-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
                  <User className="h-4 w-4" /> Full name
                </Label>
                <Input id="fullName" autoComplete="name" aria-invalid={!!errors.fullName} {...form.register("fullName")} />
                {errors.fullName && <p className="text-destructive text-sm">{errors.fullName.message}</p>}
              </div>

              <CountryPhoneField
                form={form}
                selectedCountry={selectedCountry}
                geoLoading={geoLoading}
                handleCountryChange={handleCountryChange}
              />

              <div className="grid gap-2">
                <Label className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" /> Current location
                </Label>
                <Controller
                  control={form.control}
                  name="currentLocationCode"
                  render={({ field }) => (
                    <Select
                      value={field.value || null}
                      onValueChange={(v) => {
                        if (!v) return;
                        field.onChange(v); // LocationFields clears state/city when this changes
                      }}
                      disabled={geoLoading}
                    >
                      <SelectTrigger className="w-full" aria-label="Current location" aria-invalid={!!errors.currentLocationCode} data-testid="select-current-location">
                        <SelectValue>
                          {() =>
                            currentLocation ? (
                              <span className="flex items-center gap-2">
                                <Flag code={currentLocation.code} className="h-4 w-5 rounded-sm object-cover" />
                                <span>{currentLocation.name}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{geoLoading ? "Loading..." : "Select a country"}</span>
                            )
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]" alignItemWithTrigger={false}>
                        {countries.map((c) => (
                          <SelectItem key={c.code} value={c.code} label={c.name}>
                            <Flag code={c.code} className="h-4 w-5 rounded-sm object-cover" />
                            <span className="truncate">{c.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.currentLocationCode && <p className="text-destructive text-sm">{errors.currentLocationCode.message}</p>}
              </div>

              <LocationFields form={form} countryCode={currentLocationCode} geo={geo} />

              <Button type="submit" size="lg">Submit</Button>
            </form>
          </CardContent>
        </Card>

        {stored && (
          <Card data-testid="stored-panel">
            <CardHeader>
              <CardTitle>What your database would store</CardTitle>
              <CardDescription>
                ISO codes and an international (E.164) phone number, never free-text country names.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">{JSON.stringify(stored, null, 2)}</pre>
            </CardContent>
          </Card>
        )}

        <footer className="text-muted-foreground text-center text-sm">
          Get this FREE skill on <a className="underline underline-offset-4" href={REPO_URL}>GitHub</a> · MIT licensed ·
          Created by Jay Shapiro with Claude Code · Places data from{" "}
          <a className="underline underline-offset-4" href="https://www.geonames.org">GeoNames</a> (CC BY 4.0)
        </footer>
      </div>
    </main>
  );
}
