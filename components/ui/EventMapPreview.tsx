"use client";

import React from "react";

type Props = {
  lat: number;
  lng: number;
  title?: string;
  address?: string;
};

export function EventMapPreview({ lat, lng, address }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  
  // Use Google Maps Embed API for the "Place Card" look
  const query = address ? encodeURIComponent(address) : `${lat},${lng}`;
  const embedUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${query}`;

  if (!apiKey) {
    return (
      <div 
        className="flex h-[300px] w-full items-center justify-center text-xs"
        style={{ 
          border: "1px dashed #EDE8E3", 
          background: "#F7F4EF", 
          color: "#7A6E68",
          borderRadius: "2px" 
        }}
      >
        Google Maps API Key missing
      </div>
    );
  }

  return (
    <div 
      className="overflow-hidden"
      style={{ 
        border: "1px solid #EDE8E3", 
        borderRadius: "2px",
        boxShadow: "0 2px 8px rgba(26,21,18,0.04)"
      }}
    >
      <iframe
        width="100%"
        height="350"
        style={{ border: 0 }}
        loading="lazy"
        allowFullScreen
        referrerPolicy="no-referrer-when-downgrade"
        src={embedUrl}
      ></iframe>
    </div>
  );
}
