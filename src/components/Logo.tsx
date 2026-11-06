/**
 * Seedwall mark: a seed resting on a cutting-mat tile, grown along the 45° guide
 * from the mat's origin point. Same geometry as src/app/icon.svg (the favicon).
 */
export function LogoMark({ size = 26, className }: { size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--accent)" />
      <path d="M1 11.5H31M1 20.5H31M11.5 1V31M20.5 1V31" stroke="#fff" strokeOpacity=".14" strokeWidth=".8" />
      <path d="M8.4 23.6L10.6 21.4" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="5.8" cy="26.2" r="1.7" fill="#fff" />
      <path d="M12 20C8.8 16.8 9.6 11.6 13.6 8.6C16.4 6.5 21.6 5.6 25.4 6.6C26.4 10.4 25.5 15.6 23.4 18.4C20.4 22.4 15.2 23.2 12 20Z" fill="#fff" />
      <path d="M14.6 17.4C16.6 15.4 18.8 13.2 21.4 10.6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo-word">
        Seed<span>wall</span>
      </span>
    </span>
  );
}
