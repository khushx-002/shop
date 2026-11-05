/**
 * "Guaranteed Safe Checkout" box with the 6 payment logos, shown under the cart totals and
 * under the "Your order" box. Heritage look: cream rounded box with gold icons.
 */
import Image from "next/image";
import { Icon } from "@/components/ui/Icon";

const LOGOS = [
  { src: "/images/payments/visa-card.svg", alt: "Pay safely with Visa Card" },
  { src: "/images/payments/mastercard.svg", alt: "Pay safely with Master Card" },
  { src: "/images/payments/RuPay-Card.svg", alt: "Pay safely with RuPay Card" },
  { src: "/images/payments/UPI.svg", alt: "Pay safely with UPI" },
  { src: "/images/payments/net-banking.svg", alt: "Pay safely with Netbanking" },
  { src: "/images/payments/Easy-EMI.svg", alt: "Pay safely with easy EMI options" },
];

export function SafeCheckoutBox({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-[20px] border border-line bg-cream px-[16px] py-[20px] text-center ${className}`}>
      <p className="flex items-center justify-center gap-[8px] text-[14px] font-bold text-ink">
        <Icon name="shield" size={20} className="shrink-0 text-gold-dark" />
        <span>
          Guaranteed <span className="text-primary">Safe Checkout</span>
        </span>
      </p>
      <ul className="mt-[14px] flex flex-wrap justify-center gap-[6px]">
        {LOGOS.map((l) => (
          <li key={l.src}>
            <Image src={l.src} alt={l.alt} title={l.alt} width={90} height={60} unoptimized loading="lazy" className="h-[34px] w-[52px] rounded-[6px] border border-line bg-white object-contain" />
          </li>
        ))}
      </ul>
      <p className="mt-[14px] flex items-center justify-center gap-[6px] text-[14px] text-body">
        <Icon name="lock" size={15} className="shrink-0 text-gold-dark" />
        <span>
          Your Payment is <span className="font-semibold text-ink">100% Secure</span>
        </span>
      </p>
    </div>
  );
}
