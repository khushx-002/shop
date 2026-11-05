/**
 * Endless scrolling text strip (XStore "marquee"), pure CSS.
 *   <Marquee items={["LARGEST SELLER OF CANOLA OIL IN INDIA", ...]} separator="✱" />
 * `separatorClassName` styles the separator (size / colour); the default keeps the old 22px look.
 * The movement stops for visitors who prefer reduced motion (globals.css) and pauses on hover.
 */
type Props = {
  items: React.ReactNode[];
  separator?: React.ReactNode;
  className?: string;
  itemClassName?: string;
  separatorClassName?: string;
  durationSec?: number;
  label?: string;
};

export function Marquee({ items, separator = "✱", className = "", itemClassName = "", separatorClassName = "text-[22px]", durationSec = 30, label }: Props) {
  if (!items.length) return null;
  const row = (hidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((it, i) => (
        <span key={i} className="flex items-center">
          <span className={`px-[30px] ${itemClassName}`}>{it}</span>
          {separator && <span className={`px-[20px] leading-none ${separatorClassName}`}>{separator}</span>}
        </span>
      ))}
    </div>
  );
  return (
    <div className={`marquee ${className}`} role={label ? "region" : undefined} aria-label={label}>
      <div className="marquee-track" style={{ animationDuration: `${durationSec}s` }}>
        {row(false)}
        {row(true)}
      </div>
    </div>
  );
}
