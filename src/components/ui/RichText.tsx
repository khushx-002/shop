/**
 * Renders HTML stored in our own database (product descriptions, pages, blog posts).
 * Content is written by store admins or seeded from the old site and cleaned at import
 * (only basic tags kept), so it is trusted. Scripts/event handlers are stripped again here
 * as a second safety net.
 */
function sanitize(html: string): string {
  return html
    .replace(/<\s*(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1="#"');
}

export function RichText({ html, className = "" }: { html: string | null | undefined; className?: string }) {
  if (!html) return null;
  return <div className={`prose-shop ${className}`} dangerouslySetInnerHTML={{ __html: sanitize(html) }} />;
}
