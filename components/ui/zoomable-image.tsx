"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { ZoomIn, X } from "lucide-react";

export function ZoomableImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative block w-full cursor-zoom-in"
        aria-label="Enlarge image"
      >
        <img src={src} alt={alt} className={className} />
        <span className="pointer-events-none absolute right-2 top-2 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100">
          <ZoomIn className="h-3.5 w-3.5" /> Click to enlarge
        </span>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/80 p-6"
        >
          <img src={src} alt={alt} className="max-h-full max-w-full rounded-md shadow-2xl" />
          <button
            onClick={() => setOpen(false)}
            className="absolute right-5 top-5 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}
    </>
  );
}
