import type { Metadata } from "next";
import Link from "next/link";
import { LiveThumb } from "@/components/LiveThumb";
import { REPO_URL, pageMetadata } from "@/config/seo";

export const metadata: Metadata = pageMetadata({
  title: "Seedwall for Mac — a new wallpaper every day",
  description: "A tiny menu-bar app that sets a fresh Seedwall wallpaper every morning: today's seed, a random one, a pinned favourite, or your own GitHub contribution graph. Rendered at your screen's native resolution.",
  path: "/mac",
});

export default function MacPage() {
  return (
    <div className="container section">
      <section className="gen-hero">
        <div>
          <span className="eyebrow">Seedwall for Mac · menu bar</span>
          <h1>A new wallpaper every morning.</h1>
          <p>
            A tiny menu-bar app. At midnight it sets the next seed on every display, rendered at that display&apos;s native
            resolution. Pick today&apos;s seed (the same one everyone gets), a random one, a favourite you pin, or your own
            GitHub graph, redrawn daily.
          </p>
          <div className="hero-actions">
            <a className="btn btn-primary" href={`${REPO_URL}/releases/latest`}>Download for macOS</a>
            <Link className="btn" href="/today">See today&apos;s seed</Link>
          </div>
          <p className="preview-dims" style={{ textAlign: "left", marginTop: 12 }}>macOS 13 or later · Apple silicon · free</p>
        </div>
        <div className="card-media">
          <LiveThumb gen="contributions" preset="skyline" w={2400} h={1500} label="A GitHub skyline wallpaper" />
        </div>
      </section>

      <div className="prose narrow">
        <h2>What it does</h2>
        <ul>
          <li><strong>Today&apos;s seed</strong>: everyone gets the same wallpaper on the same day, so you can say “did you see today&apos;s?”</li>
          <li><strong>Random</strong>: a different seed every day; <em>Shuffle</em> rolls another and <em>Keep</em> pins it.</li>
          <li><strong>Pinned seed</strong>: type any seed from 1 to 999999, such as one a friend sent you.</li>
          <li><strong>My GitHub</strong>: your contribution grid, skyline or commit history, in any editor theme, refreshed daily.</li>
        </ul>
        <h2>Build it yourself</h2>
        <pre>{`git clone ${REPO_URL}
cd Seedwall/mac && ./build.sh
open build/Seedwall.app`}</pre>
        <h2>Or script it</h2>
        <p>The app uses a public image API, so it also works from a shell script or a Shortcut:</p>
        <pre>{`curl -o wall.png "https://seedwall.suryansh.work/api/daily?w=3024&h=1964"
curl -o mine.png "https://seedwall.suryansh.work/api/u/<username>?look=skyline&d=macbook14"
curl "https://seedwall.suryansh.work/api/daily?format=json"`}</pre>
      </div>
    </div>
  );
}
