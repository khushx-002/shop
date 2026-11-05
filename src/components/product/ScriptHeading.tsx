/**
 * Section headline on the product pages, in the heritage style (like the shared SectionTitle):
 * Playfair Display title in Jivo green, a short gold line and an optional small muted subtitle.
 * (Was a Leckerli One script title between dashed lines on the old pages; the name is kept.)
 * `large`: a slightly bigger title ("Customer Stories" / "Customer Reviews").
 */
export function ScriptHeading({ title, subtitle, id, className = "", large = false }: { title: string; subtitle?: string | null; id?: string; className?: string; large?: boolean }) {
  return (
    <div className={`text-center ${className}`}>
      <h2 id={id} className={`font-heading font-bold leading-[1.15] text-primary ${large ? "text-[clamp(28px,3.4vw,42px)]" : "text-[clamp(26px,3vw,38px)]"}`}>
        {title}
      </h2>
      <span aria-hidden="true" className="gold-line mx-auto mt-[14px]" />
      {subtitle && <p className="mx-auto mt-[12px] max-w-[620px] text-[15px] leading-[1.6] text-muted md:text-[16px]">{subtitle}</p>}
    </div>
  );
}
