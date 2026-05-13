"use client";

import React, { useState, useCallback } from "react";
import { useJsApiLoader, Autocomplete, GoogleMap, Marker } from "@react-google-maps/api";

const libraries: "places"[] = ["places"];

type Props = {
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
  defaultValue = "",
  defaultFormattedAddress = "",
  defaultLat,
  defaultLng,
  placeholder = "Search for a location or venue...",
}: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
    libraries,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [inputValue, setInputValue] = useState(defaultValue);
  
  const [formattedAddress, setFormattedAddress] = useState(defaultFormattedAddress);
  const [lat, setLat] = useState<number | null>(defaultLat ?? null);
  const [lng, setLng] = useState<number | null>(defaultLng ?? null);
  
  const [map, setMap] = useState<google.maps.Map | null>(null);

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

  const onAutocompleteLoad = (auto: google.maps.places.Autocomplete) => {
    setAutocomplete(auto);
  };

  const onPlaceChanged = () => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        const venue = place.name || place.formatted_address || "";
        const addr = place.formatted_address || "";
        const latitude = place.geometry.location.lat();
        const longitude = place.geometry.location.lng();

        setInputValue(venue);
        setFormattedAddress(addr);
        setLat(latitude);
        setLng(longitude);

        if (map) {
          map.panTo({ lat: latitude, lng: longitude });
          map.setZoom(17);
        }
      }
    }
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
          setFormattedAddress(results[0].formatted_address);
          if (!inputValue) setInputValue(results[0].formatted_address);
        }
      });
    }
  }, [inputValue]);

  if (!apiKey || loadError) {
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
        <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
          <input
            type="text"
            name="venue"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            className="input-eventuz pr-10"
            required
          />
        </Autocomplete>
        <div 
          className="absolute right-3 top-1/2 -translate-y-1/2"
          style={{ color: "var(--champagne)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        </div>
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
