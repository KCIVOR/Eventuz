"use client";

import React from "react";

interface AnnouncementModalProps {
  announcement: {
    title: string;
    content: string;
    created_at: string;
  } | null;
  onClose: () => void;
}

export function AnnouncementModal({ announcement, onClose }: AnnouncementModalProps) {
  if (!announcement) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#1A1512]/65 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg animate-drop-in overflow-hidden rounded-[2px] border border-[#EDE8E3] bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#EDE8E3] px-7 py-6">
          <div>
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#C9A96E]">
              Event Announcement
            </p>
            <h3 className="font-serif text-3xl font-light text-[#1A1512]">
              {announcement.title}
            </h3>
            <p className="mt-1 text-[10px] font-light text-[#AEA89F] uppercase tracking-wider">
              {new Date(announcement.created_at).toLocaleDateString(undefined, { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          <button
            type="button"
            className="rounded-[1px] border border-[#1A1512] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.2em] text-[#1A1512] transition-colors hover:bg-[#1A1512] hover:text-[#FDFAF4] focus:outline-none"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="px-7 py-8">
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-sm font-light leading-relaxed text-[#2E2825]">
              {announcement.content}
            </p>
          </div>
        </div>

        <div className="bg-[#FDFAF4] px-7 py-4 border-t border-[#EDE8E3]">
          <p className="text-[10px] italic text-[#AEA89F] text-center">
            Sent by the Event Organizer via Eventuz
          </p>
        </div>
      </div>
    </div>
  );
}
