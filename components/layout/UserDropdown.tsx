"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";

interface UserDropdownProps {
  user: {
    full_name: string;
    avatar_url?: string | null;
  };
}

/**
 * User Profile Dropdown for the authenticated header.
 * Replaces the static Sign Out button with a name + avatar trigger.
 */
export function UserDropdown({ user }: UserDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 transition-colors hover:opacity-80 focus:outline-none"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="hidden flex-col items-end sm:flex">
          <span
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              color: "#AEA89F",
            }}
          >
            {user.full_name || "Account"}
          </span>
        </div>
        <Avatar src={user.avatar_url} name={user.full_name} size="md" />
      </button>

      {/* Dropdown Menu */}
      {open && (
        <div
          className="animate-drop-in absolute right-0 mt-3 min-w-[220px] overflow-hidden border border-[#EDE8E3] shadow-2xl z-50"
          style={{
            background: "#1A1512",
            borderRadius: "2px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <div className="px-4 py-3 border-bottom border-white/5 bg-white/[0.02]">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#C9A96E] mb-1">Signed in as</p>
            <p className="text-xs text-[#FDFAF4] truncate font-light">
              {user.full_name}
            </p>
          </div>

          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.1em] text-[#AEA89F] hover:bg-[#C9A96E] hover:text-[#1A1512] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Manage Profile
          </Link>

          <div className="h-px bg-white/10 mx-2" />

          <Link
            href="/auth/sign-out"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-[11px] font-medium uppercase tracking-[0.1em] text-[#AEA89F] hover:bg-[#C9A96E] hover:text-[#1A1512] transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </Link>
        </div>
      )}
    </div>
  );
}
