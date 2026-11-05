/**
 * Shared contact pieces for the FAQ, Contact and About pages (heritage look):
 *  - ContactCards: Email / Phone / Toll free / Address info strip (.card-soft items with gold icons)
 *  - SocialLinks: round outline icon links to Jivo's social profiles
 *  - ContactStrip: green rounded box "Still have questions?" with email, phone and contact-form buttons
 */
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { routes } from "@/lib/routes";
import { SITE } from "@/lib/site";

const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`Jivo Wellness, ${SITE.address}`)}`;
const TOLL_FREE_HREF = `tel:${SITE.tollFree.replace(/\s/g, "")}`;

type Card = { icon: IconName; title: string; lines: React.ReactNode; action?: React.ReactNode };

const cardLink = "font-semibold text-ink underline-offset-4 transition-colors hover:text-primary hover:underline hover:decoration-gold";

export function ContactCards() {
  const cards: Card[] = [
    {
      icon: "mail",
      title: "Email",
      lines: (
        <a href={`mailto:${SITE.email}`} className={cardLink}>
          {SITE.email}
        </a>
      ),
    },
    {
      icon: "phone",
      title: "Phone",
      lines: (
        <>
          <a href={SITE.phoneHref} className={`${cardLink} whitespace-nowrap`}>
            {SITE.phone}
          </a>
          <span className="mt-1 block text-[14px]">For purchase &amp; order tracking related queries</span>
        </>
      ),
    },
    {
      icon: "support",
      title: "Toll free",
      lines: (
        <a href={TOLL_FREE_HREF} className={`${cardLink} whitespace-nowrap`}>
          {SITE.tollFree}
        </a>
      ),
    },
    {
      icon: "map-pin",
      title: "Address",
      lines: <address className="not-italic">{SITE.address}</address>,
      action: (
        <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-[14px] font-bold text-primary transition-colors hover:text-gold-dark">
          Get directions
          <Icon name="chevron-right" size={12} />
          <span className="sr-only">(opens Google Maps in a new tab)</span>
        </a>
      ),
    },
  ];
  return (
    <section aria-labelledby="contact-cards-title">
      <h2 id="contact-cards-title" className="sr-only">
        Contact details
      </h2>
      <ul className="grid gap-[14px] sm:grid-cols-2 sm:gap-[18px] lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.title} className="card-soft flex items-start gap-[14px] px-[20px] py-[20px] shadow-soft md:px-[22px] md:py-[24px]">
            <span aria-hidden="true" className="flex size-[48px] shrink-0 items-center justify-center rounded-full border border-gold/30 bg-cream text-gold-dark">
              <Icon name={c.icon} size={21} />
            </span>
            <div className="min-w-0">
              <h3 className="font-heading text-[18px] font-bold leading-[1.25] text-primary">{c.title}</h3>
              <div className="mt-[6px] break-words text-[15px] leading-[1.55] text-body">{c.lines}</div>
              {c.action}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

const SOCIAL: { name: IconName; label: string; href: string }[] = [
  { name: "facebook", label: "Facebook", href: SITE.social.facebook },
  { name: "twitter", label: "X (Twitter)", href: SITE.social.twitter },
  { name: "instagram", label: "Instagram", href: SITE.social.instagram },
  { name: "pinterest", label: "Pinterest", href: SITE.social.pinterest },
  { name: "linkedin", label: "LinkedIn", href: SITE.social.linkedin },
  { name: "youtube", label: "YouTube", href: SITE.social.youtube },
];

export function SocialLinks({ className = "" }: { className?: string }) {
  return (
    <ul className={`flex flex-wrap items-center gap-[10px] ${className}`}>
      {SOCIAL.map((s) => (
        <li key={s.name}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex size-[42px] items-center justify-center rounded-full border border-line bg-white text-primary transition-colors hover:border-primary hover:bg-primary hover:text-white"
          >
            <Icon name={s.name} size={18} label={`Jivo on ${s.label}`} />
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Green rounded call-to-action box used at the end of FAQ and About. */
export function ContactStrip({ title = "Still have questions?", text = "Our customer care team is happy to help." }: { title?: string; text?: string }) {
  return (
    <section aria-labelledby="contact-strip-title" className="bg-white">
      <div className="site-container pb-[56px] pt-[8px] md:pb-[80px]">
        <div className="relative isolate overflow-hidden rounded-[26px] bg-primary px-[22px] py-[38px] text-white md:px-[48px] md:py-[48px]">
          {/* soft gold glow, decoration only */}
          <span aria-hidden="true" className="pointer-events-none absolute -right-[80px] -top-[90px] -z-10 size-[260px] rounded-full bg-gold/20 blur-[60px]" />
          <span aria-hidden="true" className="pointer-events-none absolute -bottom-[110px] -left-[60px] -z-10 size-[240px] rounded-full bg-white/5 blur-[40px]" />
          <div className="flex flex-col items-center gap-[24px] text-center lg:flex-row lg:justify-between lg:text-left">
            <div className="max-w-[520px]">
              <span className="eyebrow mb-[10px] text-gold-light!">We are here to help</span>
              <h2 id="contact-strip-title" className="font-heading text-[30px] font-bold italic leading-[1.15] text-white! md:text-[38px]">
                {title}
              </h2>
              <p className="mt-[10px] text-[16px] leading-[1.6] text-white/85">{text}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-[12px] lg:justify-end">
              <a href={`mailto:${SITE.email}`} className="btn border-white bg-white text-primary hover:bg-cream">
                <Icon name="mail" size={18} />
                {SITE.email}
              </a>
              <a href={SITE.phoneHref} className="btn border-white/50 bg-transparent text-white hover:border-white hover:bg-white hover:text-primary">
                <Icon name="phone" size={18} />
                {SITE.phone}
              </a>
              <Link href={routes.contact} className="btn btn-gold">
                Contact form
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
