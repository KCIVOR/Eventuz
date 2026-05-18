"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { AnnouncementModal } from "./AnnouncementModal";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  events: {
    name: string;
  };
  event_announcement_reads?: { id: string }[];
}

export function AnnouncementDropdown() {
  const [open, setOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Fetch on mount to ensure accurate unread count indicator
  useEffect(() => {
    fetchAnnouncements();
  }, []);

  // Fetch when opening to refresh data
  useEffect(() => {
    if (open) {
      fetchAnnouncements();
    }
  }, [open]);

  async function fetchAnnouncements() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Fetch announcements with a join to read records for the current user
    const { data, error } = await supabase
      .from("event_announcements")
      .select(`
        *,
        events!inner ( name, organizer_id ),
        event_announcement_reads ( id )
      `)
      .neq("events.organizer_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      const fetchedAnnouncements = data as any[];
      setAnnouncements(fetchedAnnouncements);
      
      // Calculate unread count (where event_announcement_reads array is empty)
      const unread = fetchedAnnouncements.filter(
        (ann) => !ann.event_announcement_reads || ann.event_announcement_reads.length === 0
      ).length;
      setUnreadCount(unread);
    }
  }

  async function markAsRead(announcementId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Optimistically update local state
    setAnnouncements((prev) => 
      prev.map((ann) => 
        ann.id === announcementId 
          ? { ...ann, event_announcement_reads: [{ id: "temp" }] } 
          : ann
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    // Persist to database
    await supabase.from("event_announcement_reads").upsert({
      announcement_id: announcementId,
      user_id: user.id
    });
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center transition-colors hover:opacity-80 focus:outline-none"
        style={{
          border: "1px solid rgba(201,169,110,0.25)",
          borderRadius: "2px",
          color: "#AEA89F",
          background: "transparent",
        }}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="View announcements"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C9A96E] opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#C9A96E]"></span>
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          className="animate-drop-in absolute right-0 mt-3 min-w-[320px] max-w-[400px] overflow-hidden border border-[#EDE8E3] shadow-2xl z-50"
          style={{
            background: "#1A1512",
            borderRadius: "2px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02] flex justify-between items-center">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#C9A96E]">Recent Announcements</p>
            {unreadCount > 0 && (
              <span className="text-[9px] bg-[#C9A96E]/20 text-[#C9A96E] px-2 py-0.5 rounded-full border border-[#C9A96E]/30 uppercase tracking-tighter">
                {unreadCount} Unread
              </span>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {announcements.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-xs text-[#AEA89F] italic font-light">No announcements yet.</p>
              </div>
            ) : (
              announcements.map((ann) => {
                const isUnread = !ann.event_announcement_reads || ann.event_announcement_reads.length === 0;
                
                return (
                  <button
                    key={ann.id}
                    onClick={() => {
                      setSelectedAnnouncement(ann);
                      setOpen(false);
                      if (isUnread) markAsRead(ann.id);
                    }}
                    className="w-full text-left px-4 py-4 border-b border-white/5 hover:bg-white/[0.05] transition-colors group relative"
                  >
                    {isUnread && (
                      <span className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full bg-[#C9A96E]" />
                    )}
                    <p className="text-[10px] uppercase tracking-wider text-[#C9A96E] mb-1 font-semibold">
                      {ann.events?.name || "Event Update"}
                    </p>
                    <p className={`text-xs ${isUnread ? 'text-[#FDFAF4] font-semibold' : 'text-[#AEA89F] font-medium'} group-hover:text-[#C9A96E] transition-colors line-clamp-1`}>
                      {ann.title}
                    </p>
                    <p className="text-[10px] text-[#AEA89F] mt-1 line-clamp-2 font-light opacity-80">
                      {ann.content}
                    </p>
                    <p className="text-[9px] text-white/20 mt-2 uppercase tracking-tighter">
                      {new Date(ann.created_at).toLocaleDateString()}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <AnnouncementModal
        announcement={selectedAnnouncement}
        onClose={() => setSelectedAnnouncement(null)}
      />
    </div>
  );
}
