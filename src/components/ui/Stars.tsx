/** Star rating (supports halves). Gold stars on a warm grey base (heritage look). */
export function Stars({ rating, size = 16, className = "", color = "#b68a2a" }: { rating: number; size?: number; className?: string; color?: string }) {
  const r = Math.max(0, Math.min(5, rating));
  return (
    <span className={`inline-flex items-center ${className}`} role="img" aria-label={`Rated ${r.toFixed(2).replace(/\.?0+$/, "")} out of 5`}>
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, r - i));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
            <defs>
              <linearGradient id={`st-${i}-${Math.round(fill * 100)}-${color.replace("#", "")}`}>
                <stop offset={`${fill * 100}%`} stopColor={color} />
                <stop offset={`${fill * 100}%`} stopColor="#e2d8c4" />
              </linearGradient>
            </defs>
            <path fill={`url(#st-${i}-${Math.round(fill * 100)}-${color.replace("#", "")})`} d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.1l-5.7 3.2 1.2-6.4-4.7-4.4 6.4-.8Z" />
          </svg>
        );
      })}
    </span>
  );
}
