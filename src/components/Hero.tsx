import Link from "next/link";
import { DrivePackButton } from "./DrivePackButton";
import { LiveThumb } from "./LiveThumb";
import { GENERATORS } from "@/generators";
import { THEMES } from "@/generators/shared/themes";

export function Hero() {
  return (
    <section className="hero">
      <div className="ruler" aria-hidden="true" />
      <div className="container hero-inner">
        <div>
          <span className="eyebrow">Seedwall · generative wallpapers</span>
          <h1>
            Wallpapers grown
            <br />
            from a <em>seed</em>.
          </h1>
          <p className="lead">
            {GENERATORS.length} generators, from drafting-table cutting mats and flow fields to git graphs and synthwave suns. Change
            the colours, apply one of {THEMES.length} editor themes, write your own quote or go text-free, then download a
            pixel-perfect PNG for any screen.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="/studio">Open the studio</Link>
            <Link className="btn" href="/gallery">Browse the gallery</Link>
            <DrivePackButton />
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="frame desk">
            <LiveThumb gen="cutting-mat" preset="blue-bold" w={3024} h={1964} />
          </div>
          <div className="frame phone">
            <LiveThumb gen="cutting-mat" preset="black-light" w={1290} h={2796} />
          </div>
        </div>
      </div>
    </section>
  );
}
