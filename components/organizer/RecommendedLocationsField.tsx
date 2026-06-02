"use client";

import { useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

const libraries: "places"[] = ["places"];

export type RecommendedLocationInput = {
  id?: string;
  category: "hotel" | "transport" | "other";
  name: string;
  formatted_address: string;
  place_id: string;
  lat: number | null;
  lng: number | null;
};

type Props = {
  apiKey?: string | null;
  initialLocations: RecommendedLocationInput[];
};

type DraftLocation = RecommendedLocationInput & {
  localId: string;
  suggestions: google.maps.places.AutocompleteSuggestion[];
  isSearching: boolean;
  shouldSearch: boolean;
};

const CATEGORY_LABELS: Record<RecommendedLocationInput["category"], string> = {
  hotel: "Hotel",
  transport: "Transport",
  other: "Other",
};

function localId() {
  return globalThis.crypto?.randomUUID?.() ?? `loc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function newLocation(): DraftLocation {
  return {
    localId: localId(),
    category: "hotel",
    name: "",
    formatted_address: "",
    place_id: "",
    lat: null,
    lng: null,
    suggestions: [],
    isSearching: false,
    shouldSearch: false,
  };
}

function fromInitial(row: RecommendedLocationInput): DraftLocation {
  return {
    ...row,
    localId: row.id || localId(),
    suggestions: [],
    isSearching: false,
    shouldSearch: false,
  };
}

export function RecommendedLocationsField({ apiKey, initialLocations }: Props) {
  const effectiveApiKey = apiKey?.trim() ?? "";
  const { isLoaded: loaderLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: effectiveApiKey,
    libraries,
  });
  const isLoaded = loaderLoaded || (typeof window !== "undefined" && !!window.google?.maps);
  const canUsePlaces = Boolean(effectiveApiKey && isLoaded && !loadError);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const [rows, setRows] = useState<DraftLocation[]>(() =>
    initialLocations.length ? initialLocations.map(fromInitial) : [newLocation()]
  );

  function patchRow(localId: string, patch: Partial<DraftLocation>) {
    setRows((prev) => prev.map((row) => (row.localId === localId ? { ...row, ...patch } : row)));
  }

  function moveRow(localId: string, direction: "up" | "down") {
    setRows((prev) => {
      const index = prev.findIndex((row) => row.localId === localId);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function removeRow(localId: string) {
    setRows((prev) => {
      const next = prev.filter((row) => row.localId !== localId);
      return next.length ? next : [newLocation()];
    });
  }

  async function fetchSuggestions(row: DraftLocation) {
    if (!canUsePlaces || row.name.trim().length < 3 || !row.shouldSearch) return;
    patchRow(row.localId, { isSearching: true });
    try {
      const placesLibrary = await google.maps.importLibrary("places");
      const { AutocompleteSuggestion, AutocompleteSessionToken } = placesLibrary as google.maps.PlacesLibrary;
      sessionTokenRef.current ??= new AutocompleteSessionToken();
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: row.name.trim(),
        sessionToken: sessionTokenRef.current,
      });
      patchRow(row.localId, { suggestions: suggestions ?? [], isSearching: false });
    } catch {
      patchRow(row.localId, { suggestions: [], isSearching: false });
    }
  }

  async function selectSuggestion(
    localId: string,
    suggestion: google.maps.places.AutocompleteSuggestion
  ) {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;

    const placesLibrary = await google.maps.importLibrary("places");
    const { AutocompleteSessionToken } = placesLibrary as google.maps.PlacesLibrary;
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });

    const location = place.location;
    patchRow(localId, {
      name: place.displayName ?? prediction.mainText?.toString() ?? prediction.text.toString(),
      formatted_address: place.formattedAddress ?? prediction.secondaryText?.toString() ?? "",
      place_id: prediction.placeId,
      lat: location?.lat() ?? null,
      lng: location?.lng() ?? null,
      suggestions: [],
      shouldSearch: false,
      isSearching: false,
    });
    sessionTokenRef.current = new AutocompleteSessionToken();
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name="recommended_locations_present" value="1" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-light leading-relaxed text-muted-foreground">
            Add nearby hotels, transport points, or other helpful places. These appear as Google Maps links on the landing page.
          </p>
          {!canUsePlaces ? (
            <p className="mt-2 text-[11px] italic text-muted-foreground">
              Google search is unavailable, but you can still enter names and addresses manually.
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, newLocation()])}
          className="shrink-0 rounded-sm border border-[#C9A96E]/40 bg-[#C9A96E]/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#8B6914] transition-colors hover:bg-[#C9A96E]/20"
        >
          Add place
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.localId} className="rounded-xl border border-border/70 bg-card p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-gold">
                Recommended place {index + 1}
              </span>
              <div className="flex gap-2">
                <button type="button" onClick={() => moveRow(row.localId, "up")} disabled={index === 0} className="rounded border border-border px-2 py-1 text-xs disabled:opacity-35">
                  Up
                </button>
                <button type="button" onClick={() => moveRow(row.localId, "down")} disabled={index === rows.length - 1} className="rounded border border-border px-2 py-1 text-xs disabled:opacity-35">
                  Down
                </button>
                <button type="button" onClick={() => removeRow(row.localId)} className="rounded border border-destructive/20 bg-destructive-muted px-2 py-1 text-xs text-destructive">
                  Remove
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              <label className="space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Category</span>
                <select
                  name="recommended_location_category"
                  value={row.category}
                  onChange={(e) => patchRow(row.localId, { category: e.target.value as RecommendedLocationInput["category"] })}
                  className="input-eventuz"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>

              <label className="relative space-y-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Place name</span>
                <input
                  name="recommended_location_name"
                  value={row.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const nextRow = {
                      ...row,
                      name,
                      place_id: "",
                      lat: null,
                      lng: null,
                      shouldSearch: true,
                      suggestions: name.trim().length < 3 ? [] : row.suggestions,
                    };
                    patchRow(row.localId, {
                      name: nextRow.name,
                      place_id: nextRow.place_id,
                      lat: nextRow.lat,
                      lng: nextRow.lng,
                      shouldSearch: nextRow.shouldSearch,
                      suggestions: nextRow.suggestions,
                    });
                    void fetchSuggestions(nextRow);
                  }}
                  onBlur={() => window.setTimeout(() => patchRow(row.localId, { shouldSearch: false, suggestions: [] }), 150)}
                  onFocus={() => patchRow(row.localId, { shouldSearch: true })}
                  placeholder="Search hotel, shuttle point, or nearby place..."
                  autoComplete="off"
                  className="input-eventuz"
                />
                {(row.suggestions.length > 0 || row.isSearching) && (
                  <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                    {row.isSearching && row.suggestions.length === 0 ? (
                      <p className="px-3 py-2 text-xs text-muted-foreground">Searching...</p>
                    ) : null}
                    {row.suggestions.map((suggestion) => {
                      const prediction = suggestion.placePrediction;
                      if (!prediction) return null;
                      return (
                        <button
                          key={prediction.placeId}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => void selectSuggestion(row.localId, suggestion)}
                          className="block w-full border-b border-border/70 px-3 py-2 text-left text-sm transition-colors last:border-b-0 hover:bg-muted/50"
                        >
                          <span className="block font-medium text-foreground">{prediction.mainText?.toString() ?? prediction.text.toString()}</span>
                          {prediction.secondaryText ? (
                            <span className="block text-xs text-muted-foreground">{prediction.secondaryText.toString()}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                )}
              </label>
            </div>

            <label className="mt-3 block space-y-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Address</span>
              <input
                name="recommended_location_address"
                value={row.formatted_address}
                onChange={(e) => patchRow(row.localId, { formatted_address: e.target.value, place_id: "", lat: null, lng: null })}
                placeholder="Address or Google Maps location text..."
                className="input-eventuz"
              />
            </label>

            <input type="hidden" name="recommended_location_place_id" value={row.place_id} />
            <input type="hidden" name="recommended_location_lat" value={row.lat ?? ""} />
            <input type="hidden" name="recommended_location_lng" value={row.lng ?? ""} />
          </div>
        ))}
      </div>
    </div>
  );
}
