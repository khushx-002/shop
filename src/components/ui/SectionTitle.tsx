/**
 * Section heading in the heritage style: optional small gold "eyebrow" label, a serif title
 * (Playfair Display, Jivo green), a short gold line and an optional muted subtitle.
 *   <SectionTitle eyebrow="Our range" title="In The Spotlight" subtitle="Explore the range of our top rated products" />
 * `dashed={false}` hides the gold line. `color` / `subtitleColor` are for dark bands (e.g. "#FFFFFF").
 */
type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  as?: "h1" | "h2" | "h3";
  dashed?: boolean;
  color?: string; // title colour (default Jivo green)
  subtitleColor?: string;
  className?: string;
};

export function SectionTitle({ title, subtitle, eyebrow, as = "h2", dashed = true, color, subtitleColor, className = "" }: Props) {
  const Tag = as;
  return (
    <div className={`text-center ${className}`}>
      {eyebrow && (
        <span className="eyebrow mb-3" style={color ? { color } : undefined}>
          {eyebrow}
        </span>
      )}
      <Tag className="font-heading text-[clamp(28px,3.4vw,40px)] font-bold leading-[1.15] text-primary" style={color ? { color } : undefined}>
        {title}
      </Tag>
      {dashed && <span aria-hidden="true" className="gold-line mx-auto mt-4" />}
      {subtitle && (
        <p className="mx-auto mt-3 max-w-[620px] text-[15px] leading-relaxed text-muted md:text-[16px]" style={subtitleColor ? { color: subtitleColor } : undefined}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
