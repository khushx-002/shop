/**
 * /faq/ – Frequently asked questions. The old page was overwritten by spam, so it is rebuilt from
 * the FAQ text saved before the hack (src/content/faqs.json, see components/content/faqs.tsx).
 * Heritage layout: cream page hero → questions in a soft card (the FAQ data has no groups, so no
 * category chips) → green "Still have a question?" box with a link to the contact page.
 * Static page (no cookies), refreshed hourly.
 */
import type { Metadata } from "next";
import { PageHeader } from "@/components/content/PageHeader";
import { FaqAccordion } from "@/components/content/FaqAccordion";
import { FAQS, FaqAnswer } from "@/components/content/faqs";
import { ContactStrip } from "@/components/content/ContactBlocks";
import { JsonLd } from "@/components/seo/JsonLd";
import { faqJsonLd, pageMetadata } from "@/lib/seo";
import { routes } from "@/lib/routes";

export const revalidate = 3600;

export const metadata: Metadata = pageMetadata({
  title: "FAQ's",
  description: "Answers to common questions about Jivo Mart orders, delivery, returns and replacements, payments, order tracking and customer care.",
  path: routes.faq,
});

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqJsonLd(FAQS)} />
      <PageHeader
        eyebrow="Help centre"
        title="FAQ's"
        subtitle="Everything you need to know about ordering from Jivo Mart"
        crumbs={[{ label: "Home", href: routes.home }, { label: "FAQ's" }]}
      />
      <div className="site-container pb-[48px] pt-[36px] md:pb-[64px] md:pt-[56px]">
        <div className="card-soft mx-auto max-w-[880px] px-[18px] py-[6px] shadow-soft md:px-[40px] md:py-[14px] [&>div>div:last-child]:border-b-0 [&>div]:border-t-0">
          <FaqAccordion items={FAQS.map((f) => ({ id: f.id, question: f.q, answer: <FaqAnswer text={f.a} /> }))} headingLevel={2} defaultOpen={[FAQS[0]?.id ?? ""]} />
        </div>
      </div>
      <ContactStrip title="Still have a question?" text="Our customer care team is happy to help. Write to us, call us or use the contact form." />
    </>
  );
}
