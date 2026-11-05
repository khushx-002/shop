import { describe, expect, it } from "vitest";
import { accountCreatedEmail, contactMessageEmail, esc, orderConfirmationEmail, passwordResetEmail, type EmailOrder } from "@/lib/email-templates";

const EVIL = `<script>alert("x")</script>&'`;
const ESCAPED = "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;";

describe("esc", () => {
  it("escapes HTML special characters", () => {
    expect(esc(EVIL)).toBe(ESCAPED);
  });

  it("handles numbers, null and undefined", () => {
    expect(esc(5)).toBe("5");
    expect(esc(null)).toBe("");
    expect(esc(undefined)).toBe("");
  });
});

describe("templates escape user input", () => {
  it("contact form message", () => {
    const mail = contactMessageEmail({ name: EVIL, email: "a@b.in", phone: EVIL, subject: "Hi <b>", message: `line 1\n${EVIL}` });
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain(ESCAPED);
    expect(mail.html).toContain("Hi &lt;b&gt;");
    expect(mail.html).toContain("line 1<br>"); // new lines become <br> after escaping
  });

  it("order confirmation (names, addresses, notes, product names)", () => {
    const order: EmailOrder = {
      number: "JM12345678",
      createdAt: new Date("2026-10-14T10:00:00Z"),
      email: "buyer@example.com",
      subtotalPaise: 109900,
      discountPaise: 20000,
      shippingPaise: 0,
      totalPaise: 89900,
      couponCode: "JIVO200",
      shippingMethod: "Free shipping",
      billing: { fullName: EVIL, address1: "<img src=x onerror=alert(1)>", city: "Delhi", state: "Delhi", postcode: "110064", phone: "9876543210" },
      shipping: { fullName: "Ship <i>To</i>", address1: "Street 1", city: "Delhi", state: "Delhi", postcode: "110064" },
      items: [{ productName: "Oil <b>bold</b>", variationLabel: "5 Litre", qty: 1, lineTotalPaise: 109900 }],
      customerNote: EVIL,
    };
    const mail = orderConfirmationEmail(order, "/checkout/order-received/JM12345678/?key=abc");
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).not.toContain("<img src=x");
    expect(mail.html).not.toContain("<b>bold</b>");
    expect(mail.html).not.toContain("<i>To</i>");
    expect(mail.html).toContain("Oil &lt;b&gt;bold&lt;/b&gt;");
    expect(mail.html).toContain("₹1,099.00");
    expect(mail.html).toContain("-₹200.00");
    expect(mail.subject).toBe("Your Jivo Mart order #JM12345678 has been received!");
  });

  it("password emails escape the name and the link", () => {
    const reset = passwordResetEmail(EVIL, `/my-account/reset-password/?token=a"b`);
    expect(reset.html).not.toContain("<script>");
    expect(reset.html).toContain('token=a&quot;b');
    const created = accountCreatedEmail(`x"<y>@example.com`, "/my-account/reset-password/?token=t");
    expect(created.html).toContain("x&quot;&lt;y&gt;@example.com");
  });
});
