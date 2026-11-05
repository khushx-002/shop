/**
 * HTML email templates in the Jivo Mart style (green header, simple body, contact footer).
 * All dynamic values are escaped.
 */
import { SITE } from "@/lib/site";
import { formatPaise } from "@/lib/pricing";

export function esc(s: string | number | null | undefined): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function absolute(pathOrUrl: string): string {
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  return SITE.url.replace(/\/$/, "") + pathOrUrl;
}

function layout(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;color:#333;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f4f4;padding:24px 0;"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:6px;overflow:hidden;">
<tr><td style="background:#0f4526;padding:20px 24px;text-align:center;"><img src="${absolute("/images/brand/jivo-logo-png-.png")}" alt="Jivo" width="110" style="display:inline-block;height:auto;"></td></tr>
<tr><td style="padding:28px 24px 8px;"><h1 style="margin:0 0 16px;font-size:22px;color:#0f4526;">${esc(title)}</h1>${body}</td></tr>
<tr><td style="padding:20px 24px;border-top:1px solid #eee;font-size:12px;color:#777;line-height:1.6;">
${esc(SITE.company)} · ${esc(SITE.address)}<br>Email <a href="mailto:${SITE.email}" style="color:#0f4526;">${SITE.email}</a> · Phone ${esc(SITE.phone)}<br>
<a href="${absolute("/")}" style="color:#0f4526;">${esc(SITE.url.replace(/^https?:\/\//, ""))}</a>
</td></tr></table></td></tr></table></body></html>`;
}

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${esc(absolute(href))}" style="background:#0f4526;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:4px;font-weight:bold;display:inline-block;">${esc(label)}</a></p>`;
}

const p = (html: string) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;">${html}</p>`;

export function passwordResetEmail(name: string | null, link: string) {
  return {
    subject: "Password reset request for Jivo Mart",
    html: layout(
      "Reset your password",
      p(`Hi ${esc(name || "there")},`) +
        p("Someone asked to reset the password of your Jivo Mart account. If this was you, click the button below. The link works for 1 hour.") +
        button(link, "Set a new password") +
        p("If you did not ask for this, you can ignore this email. Your password will not change."),
    ),
  };
}

export function accountCreatedEmail(email: string, link: string) {
  return {
    subject: "Your Jivo Mart account has been created!",
    html: layout(
      "Welcome to Jivo Mart",
      p("Thanks for creating an account on Jivo Mart.") +
        p(`Your username is <strong>${esc(email)}</strong>. Click the button below to set your password. The link works for 7 days.`) +
        button(link, "Set your password") +
        p("You can see your orders, addresses and account details in <em>My account</em> after you log in."),
    ),
  };
}

export type EmailOrder = {
  number: string;
  createdAt: string | Date;
  email: string;
  subtotalPaise: number;
  discountPaise: number;
  shippingPaise: number;
  totalPaise: number;
  couponCode?: string | null;
  shippingMethod?: string | null;
  billing: { fullName: string; address1: string; address2?: string; city: string; state: string; postcode: string; phone?: string };
  shipping: { fullName: string; address1: string; address2?: string; city: string; state: string; postcode: string };
  items: { productName: string; variationLabel?: string | null; qty: number; lineTotalPaise: number }[];
  customerNote?: string | null;
  /** paid in cash when delivered (no online payment yet) */
  cashOnDelivery?: boolean;
};

function orderTable(o: EmailOrder): string {
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #eee;">${esc(i.productName)}${i.variationLabel ? ` – ${esc(i.variationLabel)}` : ""} × ${i.qty}</td><td style="padding:8px;border-bottom:1px solid #eee;text-align:right;">${esc(formatPaise(i.lineTotalPaise))}</td></tr>`,
    )
    .join("");
  const line = (label: string, value: string, bold = false) =>
    `<tr><td style="padding:8px;${bold ? "font-weight:bold;" : ""}">${esc(label)}</td><td style="padding:8px;text-align:right;${bold ? "font-weight:bold;" : ""}">${esc(value)}</td></tr>`;
  const addr = (a: EmailOrder["shipping"]) => [a.fullName, a.address1, a.address2, `${a.city} ${a.postcode}`, a.state].filter(Boolean).map(esc).join("<br>");
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border:1px solid #eee;border-collapse:collapse;font-size:14px;margin:16px 0;">
<tr><th style="padding:8px;text-align:left;background:#f7f7f7;">Product</th><th style="padding:8px;text-align:right;background:#f7f7f7;">Price</th></tr>${rows}
${line("Subtotal", formatPaise(o.subtotalPaise))}${o.discountPaise ? line(`Discount${o.couponCode ? ` (${o.couponCode})` : ""}`, "-" + formatPaise(o.discountPaise)) : ""}
${line("Shipping", o.shippingPaise ? formatPaise(o.shippingPaise) : o.shippingMethod || "Free shipping")}${o.cashOnDelivery ? line("Payment method", "Cash on delivery") : ""}${line("Total", formatPaise(o.totalPaise), true)}</table>
<table role="presentation" width="100%" style="font-size:14px;line-height:1.6;"><tr><td valign="top" style="padding-right:12px;"><strong>Billing address</strong><br>${addr(o.billing)}${o.billing.phone ? `<br>${esc(o.billing.phone)}` : ""}<br>${esc(o.email)}</td><td valign="top"><strong>Shipping address</strong><br>${addr(o.shipping)}</td></tr></table>
${o.customerNote ? p(`<strong>Note:</strong> ${esc(o.customerNote)}`) : ""}`;
}

export function orderConfirmationEmail(o: EmailOrder, viewLink: string) {
  return {
    subject: `Your Jivo Mart order #${o.number} has been received!`,
    html: layout(
      "Thank you for your order",
      p(`Hi ${esc(o.billing.fullName)},`) +
        p(
          o.cashOnDelivery
            ? `We have received your order <strong>#${esc(o.number)}</strong>. Please pay in cash when it is delivered. We will email you again when it ships. Orders are not shipped or delivered on weekends or public holidays.`
            : `We have received your order <strong>#${esc(o.number)}</strong> and your payment. We will email you again when it ships. Orders are not shipped or delivered on weekends or public holidays.`,
        ) +
        orderTable(o) +
        button(viewLink, "View your order"),
    ),
  };
}

export function adminNewOrderEmail(o: EmailOrder, adminLink: string) {
  return {
    subject: `[Jivo Mart] New order #${o.number} – ${formatPaise(o.totalPaise)}`,
    html: layout(`New order #${o.number}`, p(`You have received a ${o.cashOnDelivery ? "cash on delivery" : "paid"} order from ${esc(o.billing.fullName)} (${esc(o.email)}).`) + orderTable(o) + button(adminLink, "Open in admin")),
  };
}

export function orderStatusEmail(o: { number: string; fullName: string }, status: string, extraHtml: string, viewLink: string) {
  return {
    subject: `Your Jivo Mart order #${o.number} is ${status.toLowerCase()}`,
    html: layout(`Order #${o.number}: ${status}`, p(`Hi ${esc(o.fullName)},`) + extraHtml + button(viewLink, "View your order")),
  };
}

export function backInStockEmail(productName: string, link: string) {
  return {
    subject: `${productName} is back in stock at Jivo Mart`,
    html: layout("Good news! It's back in stock", p(`<strong>${esc(productName)}</strong> is available again. Stock is limited, so order soon.`) + button(link, "Buy now") + p("You received this email because you joined the waiting list for this product.")),
  };
}

export function contactMessageEmail(m: { name: string; email: string; phone?: string | null; subject?: string | null; message: string }) {
  return {
    subject: `[Jivo Mart] Contact form: ${m.subject || "New message"} – ${m.name}`,
    html: layout(
      "New contact form message",
      p(`<strong>Name:</strong> ${esc(m.name)}<br><strong>Email:</strong> ${esc(m.email)}${m.phone ? `<br><strong>Phone:</strong> ${esc(m.phone)}` : ""}${m.subject ? `<br><strong>Subject:</strong> ${esc(m.subject)}` : ""}`) +
        p(esc(m.message).replace(/\n/g, "<br>")),
    ),
  };
}
