"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const libraries: "places"[] = ["places"];

type Props = {
  apiKey?: string | null;
  defaultValue?: string;
  defaultFormattedAddress?: string;
  defaultLat?: number;
  defaultLng?: number;
  placeholder?: string;
  onPlaceSelected?: (data: {
    venue: string;
    formatted_address: string;
    lat: number;
    lng: number;
  }) => void;
};

const mapContainerStyle = {
  width: "100%",
  height: "300px",
  borderRadius: "2px",
  marginTop: "12px",
  border: "1px solid #EDE8E3",
};

// Default center (e.g., Philippines)
const defaultCenter = {
  lat: 12.8797,
  lng: 121.774,
};

export function GooglePlaceAutocomplete({
  apiKey,
  defaultValue = "",
  defaultFormattedAddress = "",
  defaultLat,
  defaultLng,
  placeholder = "Search for a location or venue...",
  onPlaceSelected,
}: Props) {
  const effectiveApiKey = apiKey?.trim() ?? "";

  const { isLoaded: loaderLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: effectiveApiKey,
    libraries,
  });

  const isLoaded = loaderLoaded || (typeof window !== "undefined" && !!window.google?.maps);

  const [inputValue, setInputValue] = useState(defaultValue);
  const [formattedAddress, setFormattedAddress] = useState(defaultFormattedAddress);
  const [lat, setLat] = useState<number | null>(defaultLat ?? null);
  const [lng, setLng] = useState<number | null>(defaultLng ?? null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);

  const mapOptions = React.useMemo(() => ({
    disableDefaultUI: true,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: true,
  }), []);

  const onMapLoad = useCallback((m: google.maps.Map) => {
    setMap(m);
  }, []);

  useEffect(() => {
    if (!isLoaded || !effectiveApiKey || inputValue.trim().length < 3) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setIsSearching(true);
        const placesLibrary = await google.maps.importLibrary("places");
        const { AutocompleteSuggestion, AutocompleteSessionToken } = placesLibrary as google.maps.PlacesLibrary;
        sessionTokenRef.current ??= new AutocompleteSessionToken();
        const { suggestions: nextSuggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: inputValue.trim(),
          sessionToken: sessionTokenRef.current,
        });

        if (!cancelled) {
          setSuggestions(nextSuggestions ?? []);
        }
      } catch (e) {
        console.error("[eventuz:places-autocomplete]", e instanceof Error ? e.message : e);
        if (!cancelled) {
          setSuggestions([]);
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [effectiveApiKey, inputValue, isLoaded]);

  const applyLocation = useCallback(
    (venue: string, addr: string, latitude: number, longitude: number) => {
      setInputValue(venue);
      setFormattedAddress(addr);
      setLat(latitude);
      setLng(longitude);
      setSuggestions([]);

      if (map) {
        map.panTo({ lat: latitude, lng: longitude });
        map.setZoom(17);
      }

      onPlaceSelected?.({
        venue,
        formatted_address: addr,
        lat: latitude,
        lng: longitude,
      });
    },
    [map, onPlaceSelected]
  );

  const onSuggestionSelected = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    const prediction = suggestion.placePrediction;
    if (!prediction) return;

    const placesLibrary = await google.maps.importLibrary("places");
    const { AutocompleteSessionToken } = placesLibrary as google.maps.PlacesLibrary;
    const place = prediction.toPlace();
    await place.fetchFields({ fields: ["displayName", "formattedAddress", "location"] });

    const location = place.location;
    if (!location) return;

    const latitude = location.lat();
    const longitude = location.lng();
    const addr = place.formattedAddress ?? "";
    const venue = place.displayName ?? addr ?? prediction.text.toString();

    applyLocation(venue, addr, latitude, longitude);
    sessionTokenRef.current = new AutocompleteSessionToken();
  };

  const onMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const newLat = e.latLng.lat();
      const newLng = e.latLng.lng();
      setLat(newLat);
      setLng(newLng);
      
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: { lat: newLat, lng: newLng } }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const addr = results[0].formatted_address;
          setFormattedAddress(addr);
          if (!inputValue) setInputValue(addr);
          onPlaceSelected?.({
            venue: inputValue || addr,
            formatted_address: addr,
            lat: newLat,
            lng: newLng,
          });
        }
      });
    }
  }, [inputValue, onPlaceSelected]);

  if (!effectiveApiKey || loadError) {
    return (
      <div className="flex flex-col gap-1">
        <input
          type="text"
          name="venue"
          defaultValue={defaultValue}
          placeholder={placeholder}
          className="input-eventuz"
          required
        />
        <input type="hidden" name="formatted_address" value={defaultFormattedAddress ?? ""} />
        <input type="hidden" name="lat" value={defaultLat ?? ""} />
        <input type="hidden" name="lng" value={defaultLng ?? ""} />
        <p 
          className="px-1 text-[10px] italic"
          style={{ color: "var(--destructive)", fontWeight: 300 }}
        >
          Maps integration disabled (missing API key or load error)
        </p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div 
        className="h-[300px] w-full animate-pulse" 
        style={{ background: "#F7F4EF", border: "1px solid #EDE8E3", borderRadius: "2px" }} 
      />
    );
  }

  const currentPos = lat && lng ? { lat, lng } : null;

  return (
    <div className="flex flex-col">
      <div className="relative">
        <input
          type="text"
          name="venue"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            if (e.target.value.trim().length < 3) {
              setSuggestions([]);
            }
          }}
          onBlur={() => window.setTimeout(() => setSuggestions([]), 150)}
          placeholder={placeholder}
          className="input-eventuz pr-10"
          autoComplete="off"
          required
        />
        <div 
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--champagne)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
        {(suggestions.length > 0 || isSearching) && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg">
            {isSearching && suggestions.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Searching...</p>
            ) : null}
            {suggestions.map((suggestion) => {
              const prediction = suggestion.placePrediction;
              if (!prediction) return null;
              return (
                <button
                  key={prediction.placeId}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void onSuggestionSelected(suggestion)}
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
      </div>

      <div className="group relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={currentPos || defaultCenter}
          zoom={currentPos ? 17 : 5}
          onLoad={onMapLoad}
          onClick={onMapClick}
          options={mapOptions}
        >
          {currentPos && <Marker position={currentPos} />}
        </GoogleMap>
        
        {!currentPos && (
          <div 
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(26,21,18,0.05)", backdropFilter: "blur(1px)", borderRadius: "2px", marginTop: "12px" }}
          >
            <p 
              className="px-4 py-2 text-xs shadow-sm"
              style={{ background: "#fff", border: "1px solid #EDE8E3", borderRadius: "1px", color: "var(--charcoal)", fontWeight: 300 }}
            >
              Search or click on the map to tag a location
            </p>
          </div>
        )}
      </div>

      <input type="hidden" name="formatted_address" value={formattedAddress ?? ""} />
      <input type="hidden" name="lat" value={lat ?? ""} />
      <input type="hidden" name="lng" value={lng ?? ""} />

      {formattedAddress && (
        <p className="mt-2 px-1 text-[11px]" style={{ color: "var(--mid-gray)", fontWeight: 300 }}>
          <span style={{ fontWeight: 500, color: "var(--charcoal)" }}>Tagged:</span> {formattedAddress}
        </p>
      )}
    </div>
  );
}
