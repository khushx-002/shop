/**
 * Top of every information page in the heritage style: a cream `.page-hero` band with the
 * breadcrumb ("Return to previous page" on the right), a small gold eyebrow label, the page title
 * as a Playfair headline with the gold line, and an optional muted subtitle.
 * The title is the page's only <h1>.
 */
import { Breadcrumbs, type Crumb } from "@/components/ui/Breadcrumbs";
import { SectionTitle } from "@/components/ui/SectionTitle";

export function PageHeader({ title, subtitle, crumbs, eyebrow }: { title: string; subtitle?: string; crumbs: Crumb[]; eyebrow?: string }) {
  return (
    <div className="page-hero">
      <div className="site-container pb-[52px] pt-[16px] md:pb-[76px] md:pt-[20px]">
        <Breadcrumbs items={crumbs} showBack />
        <SectionTitle
          as="h1"
          eyebrow={eyebrow}
          title={title}
          subtitle={subtitle}
          className="mx-auto mt-[36px] max-w-[860px] md:mt-[52px] [&_h1]:text-[clamp(34px,5vw,52px)]"
        />
      </div>
    </div>
  );
}
