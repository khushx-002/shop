/**
 * Share bar under a blog post: a gold "Share" label and round outline icon buttons between two
 * thin lines. Plain links to each network's share page (no third-party scripts) + a copy-link button.
 */
import { CopyLinkButton } from "@/components/content/CopyLinkButton";
import { Icon } from "@/components/ui/Icon";

const iconBtn =
  "flex size-[42px] items-center justify-center rounded-full border border-line bg-white text-primary transition-colors hover:border-primary hover:bg-primary hover:text-white focus-visible:border-primary focus-visible:bg-primary focus-visible:text-white";

function WhatsAppIcon() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.4.8 3.2.6.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z" />
    </svg>
  );
}

export function ShareLinks({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: "Share on WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, icon: <WhatsAppIcon /> },
    { label: "Share on Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${u}`, icon: <Icon name="facebook" size={18} /> },
    { label: "Share on X", href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, icon: <Icon name="twitter" size={18} /> },
    { label: "Share on LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, icon: <Icon name="linkedin" size={18} /> },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-[12px] border-y border-line py-[20px]">
      <span className="eyebrow">Share:</span>
      <ul className="flex flex-wrap items-center justify-center gap-[8px]">
        {links.map((l) => (
          <li key={l.label}>
            <a href={l.href} target="_blank" rel="noopener noreferrer" className={iconBtn} title={l.label}>
              {l.icon}
              <span className="sr-only">{l.label} (opens in a new tab)</span>
            </a>
          </li>
        ))}
        <li className="flex items-center gap-[8px]">
          <CopyLinkButton url={url} className={iconBtn} />
        </li>
      </ul>
    </div>
  );
}
