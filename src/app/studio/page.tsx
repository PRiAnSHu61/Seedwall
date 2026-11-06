import type { Metadata } from "next";
import { Suspense } from "react";
import { Studio } from "@/components/Studio";
import { pageMetadata } from "@/config/seo";

export const metadata: Metadata = pageMetadata({
  title: "Wallpaper Studio — design your own wallpaper",
  description:
    "Pick a generator, change colours, apply an editor theme, write your own quote or go text-free, then download a full-size PNG or SVG for MacBook, iPhone, Android, iPad, 4K or a custom size.",
  path: "/studio",
});

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="container section"><p className="empty">Loading studio…</p></div>}>
      <Studio />
    </Suspense>
  );
}
