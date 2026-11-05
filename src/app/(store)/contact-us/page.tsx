/**
 * /contact-us/ – Jivo's real contact details, a working contact form (POST /api/contact/) and
 * the first FAQs. The old page only had theme demo text and a broken form.
 * Heritage layout: cream page hero → info strip of contact cards → form in a cream card on the
 * left; green "call us" box, FAQs and social links on the right.
 * Static page (the form is a small client component).
 */
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/content/PageHeader";
import { ContactCards, SocialLinks } from "@/components/content/ContactBlocks";
import { ContactForm } from "@/components/content/ContactForm";
import { FaqAccordion } from "@/components/content/FaqAccordion";
import { FAQS, FaqAnswer } from "@/components/content/faqs";
import { Icon } from "@/components/ui/Icon";
import { pageMetadata } from "@/lib/seo";
import { routes } from "@/lib/routes";
import { SITE } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "Contact Us",
  description: "Contact Jivo Mart customer care: email info@jivo.in, call +91 8595 349 565 or toll free 1800 137 4433, or send us a message.",
  path: routes.contact,
});

const TOLL_FREE_HREF = `tel:${SITE.tollFree.replace(/\s/g, "")}`;

/** Section heading: Playfair, Jivo green. */
function BlockTitle({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="font-heading text-[26px] font-bold leading-[1.2] text-primary md:text-[30px]">
      {children}
    </h2>
  );
}

export default function ContactPage() {
  return (
    <>
      <PageHeader
        eyebrow="Get in touch"
        title="Contact Us"
        subtitle="We would love to hear from you"
        crumbs={[{ label: "Home", href: routes.home }, { label: "Contact Us" }]}
      />

      <div className="site-container pb-[60px] pt-[32px] md:pb-[88px] md:pt-[44px]">
        <ContactCards />

        <div className="mt-[40px] grid gap-[36px] lg:mt-[52px] lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)] lg:gap-[44px]">
          <section aria-labelledby="contact-form-title" className="self-start rounded-[22px] border border-line bg-cream p-[22px] md:p-[36px]">
            <span className="eyebrow mb-[8px]">Write to us</span>
            <BlockTitle id="contact-form-title">Send us a message</BlockTitle>
            <p className="mb-[24px] mt-[10px] text-[15px] leading-[1.6] text-body md:text-[16px]">
              Questions about an order, a product or a bulk enquiry? Fill in the form and our team will reply by email. Fields marked <span className="text-danger">*</span> are required.
            </p>
            <ContactForm />
          </section>

          <div className="space-y-[36px]">
            <section aria-labelledby="contact-call-title" className="relative isolate overflow-hidden rounded-[22px] bg-primary p-[24px] text-white md:p-[30px]">
              <span aria-hidden="true" className="pointer-events-none absolute -right-[60px] -top-[70px] -z-10 size-[200px] rounded-full bg-gold/25 blur-[50px]" />
              <div className="flex items-start gap-[16px]">
                <span aria-hidden="true" className="flex size-[48px] shrink-0 items-center justify-center rounded-full bg-white/10 text-gold-light">
                  <Icon name="phone" size={22} />
                </span>
                <div className="min-w-0">
                  <h2 id="contact-call-title" className="font-heading text-[24px] font-bold leading-[1.2] text-white!">
                    Prefer to talk?
                  </h2>
                  <p className="mt-[6px] text-[15px] leading-[1.55] text-white/85">Call us for purchase and order tracking related queries.</p>
                </div>
              </div>
              <div className="mt-[20px] grid gap-[10px] sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                <a href={SITE.phoneHref} className="btn border-white bg-white text-primary hover:bg-cream">
                  <Icon name="phone" size={16} />
                  {SITE.phone}
                </a>
                <a href={TOLL_FREE_HREF} className="btn border-white/50 bg-transparent text-white hover:border-white hover:bg-white hover:text-primary">
                  <Icon name="support" size={16} />
                  <span>
                    <span className="sr-only">Toll free </span>
                    {SITE.tollFree}
                  </span>
                </a>
              </div>
            </section>

            <section aria-labelledby="contact-faq-title">
              <span className="eyebrow mb-[8px]">Quick answers</span>
              <BlockTitle id="contact-faq-title">Frequently asked questions</BlockTitle>
              <div className="mt-[14px]">
                <FaqAccordion items={FAQS.slice(0, 4).map((f) => ({ id: `contact-${f.id}`, question: f.q, answer: <FaqAnswer text={f.a} /> }))} />
              </div>
              <Link
                href={routes.faq}
                className="mt-[18px] inline-flex items-center gap-1 text-[15px] font-bold text-primary underline decoration-gold decoration-2 underline-offset-[6px] transition-colors hover:text-gold-dark"
              >
                See all FAQ&apos;s
                <Icon name="chevron-right" size={12} />
              </Link>
            </section>

            <section aria-labelledby="contact-social-title" className="card-soft p-[22px] md:p-[26px]">
              <BlockTitle id="contact-social-title">Follow us</BlockTitle>
              <p className="mb-[16px] mt-[6px] text-[15px] leading-[1.55] text-body">Recipes, offers and healthy living tips from the Jivo family.</p>
              <SocialLinks />
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
