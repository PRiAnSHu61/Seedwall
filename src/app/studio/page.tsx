import type { Metadata } from "next";
import { Suspense } from "react";
import { Studio } from "@/components/Studio";

export const metadata: Metadata = {
  title: "Studio",
  description: "Pick a generator, tweak colours and text, and download a wallpaper sized for any device.",
};

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="container section"><p className="empty">Loading studio…</p></div>}>
      <Studio />
    </Suspense>
  );
}
