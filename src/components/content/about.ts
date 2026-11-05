/**
 * Splits the About Us page HTML (pages table, editable in the admin) into the sections the
 * designed layout needs. The page is written as:
 *   intro paragraphs
 *   <h2>Building a healthy economy together!</h2> <p>…</p>
 *   <h2>Our Core Tenets</h2> (<h3>title</h3><p>text</p>) × n
 *   <h2>Get in touch</h2> …   (shown by the contact strip instead)
 * Any other <h2> section is kept and shown after the story, so admin edits never disappear.
 */
export type AboutSection = { title: string; html: string };
export type Tenet = { title: string; text: string };

export type AboutContent = {
  storyHtml: string;
  economy: AboutSection | null;
  tenets: { title: string; items: Tenet[] } | null;
  other: AboutSection[];
};

const stripTags = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#8217;|&rsquo;/g, "’")
    .replace(/\s+/g, " ")
    .trim();

export function splitAbout(html: string): AboutContent {
  const parts = html.split(/<h2[^>]*>/i);
  const storyHtml = (parts.shift() ?? "").trim();
  const sections: AboutSection[] = parts.map((p) => {
    const end = p.search(/<\/h2>/i);
    return end === -1 ? { title: "", html: p.trim() } : { title: stripTags(p.slice(0, end)), html: p.slice(end + 5).trim() };
  });

  const result: AboutContent = { storyHtml, economy: null, tenets: null, other: [] };
  for (const s of sections) {
    const key = s.title.toLowerCase();
    if (key.includes("healthy economy")) result.economy = s;
    else if (key.includes("tenet") || key.includes("core value")) {
      const items: Tenet[] = [];
      for (const m of s.html.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*([\s\S]*?)(?=<h3|$)/gi)) {
        const title = stripTags(m[1]);
        const text = stripTags(m[2]);
        if (title) items.push({ title, text });
      }
      if (items.length) result.tenets = { title: s.title, items };
      else result.other.push(s);
    } else if (key.includes("get in touch") || key.includes("contact")) {
      // replaced by the contact strip (same data from SITE)
    } else result.other.push(s);
  }
  return result;
}
