/**
 * "1 Shopping cart – 2 Checkout – 3 Order status" bar shown at the top of the cart, checkout and
 * thank-you pages. Heritage look: the current step is a green circle, finished steps are gold
 * circles with a tick, later steps are outlined; a short line joins the steps (gold once reached).
 * On tablet/phone only the current step is shown, like the old site.
 * `variant="plain"` is the empty-cart look (own container, no bottom border).
 * `variant="header"` is the bar inside CheckoutHeader (no own container, border or vertical padding).
 */
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { routes } from "@/lib/routes";

const STEPS = [
  { n: 1, label: "Shopping cart", href: routes.cart },
  { n: 2, label: "Checkout", href: routes.checkout },
  { n: 3, label: "Order status", href: null },
] as const;

export function StepsBar({ active, variant = "default" }: { active: 1 | 2 | 3; variant?: "default" | "plain" | "header" }) {
  const plain = variant === "plain";
  const inHeader = variant === "header";
  const box = inHeader ? "" : plain ? "site-container py-[28px] min-[993px]:py-[34px]" : "site-container py-[24px] min-[993px]:py-[28px]";
  return (
    <nav aria-label="Checkout progress" className={plain || inHeader ? "" : "border-b border-line"}>
      <ol className={`flex items-center justify-center text-[15px] font-semibold leading-[1.4] text-muted min-[993px]:text-[16px] ${box}`}>
        {STEPS.map((s, i) => {
          const done = s.n < active;
          const current = s.n === active;
          const circle = current ? "border-primary bg-primary text-white" : done ? "border-gold-dark bg-gold-dark text-white" : "border-line bg-white text-muted";
          const content = (
            <>
              <span aria-hidden="true" className={`mr-[10px] inline-flex size-[32px] shrink-0 items-center justify-center rounded-full border text-[14px] font-bold ${circle}`}>
                {done ? <Icon name="check" size={15} strokeWidth={2.4} /> : s.n}
              </span>
              <span className={current ? "text-primary" : done ? "text-ink" : ""}>{s.label}</span>
            </>
          );
          return (
            <li key={s.n} className={`items-center ${current ? "flex" : "hidden min-[993px]:flex"}`} aria-current={current ? "step" : undefined}>
              {i > 0 && <span aria-hidden="true" className={`mx-[16px] hidden h-[2px] w-[56px] rounded-full min-[993px]:inline-block ${s.n <= active ? "bg-gold" : "bg-line"}`} />}
              {s.href && !current && s.n < 3 ? (
                <Link href={s.href} className="inline-flex items-center rounded-full transition-colors hover:text-primary">
                  {content}
                </Link>
              ) : (
                <span className="inline-flex items-center">{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
