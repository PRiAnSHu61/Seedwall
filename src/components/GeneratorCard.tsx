import Link from "next/link";
import type { AnyGenerator } from "@/generators";
import { LiveThumb } from "./LiveThumb";

export function GeneratorCard({ gen }: { gen: AnyGenerator }) {
  const first = gen.presets[0];
  return (
    <Link href={`/generators/${gen.id}`} className="card">
      <div className="card-media">
        <LiveThumb gen={gen.id} preset={first?.id} w={1600} h={1000} label={`${gen.name} — ${first?.title ?? "default"}`} />
      </div>
      <div className="card-body">
        <h3>{gen.name}</h3>
        <p>{gen.description}</p>
        <div className="card-meta">
          <span className="tag">{gen.presets.length} presets</span>
          <span className="tag">{Object.keys(gen.params).length} controls</span>
        </div>
      </div>
    </Link>
  );
}
