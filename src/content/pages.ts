/**
 * Text for the information pages. Facts come from shop.jivo.in (FAQ captured on 13 Oct 2026),
 * the home page and jivo.in. Sections marked "to confirm" must be checked by Jivo before launch.
 */
export type PageSeed = { slug: string; title: string; bodyHtml: string; seoDescription?: string };

export const PAGES: PageSeed[] = [
  {
    slug: "about-us",
    title: "About Us",
    seoDescription: "Jivo Wellness is a New Delhi based wellness company and India's largest seller of canola oil, with 300+ certifications and 100+ awards.",
    bodyHtml: `
<p>A health-conscious brand dedicated to promoting sustainable living, we support initiatives from initial research to final product development, aiming to shape lives and make a significant impact in our communities.</p>
<p>Jivo Mart is the official online store of <strong>Jivo Wellness Pvt. Ltd.</strong>, the largest seller of canola oil in India, with more than 300 certifications and 100+ awards and recognitions. Our products are pure from nature and free from chemicals.</p>
<h2>Building a healthy economy together!</h2>
<p>By integrating expertise and skill to innovate products which make life a healthier place. Find out how #HealthyInnovation.</p>
<h2>Our Core Tenets</h2>
<h3>Intelligence is what we believe</h3>
<p>At Jivo, we focus on creating intelligent, sustainable nutrition with all-natural cooking oils. Inspired by tradition and made with pure ingredients, our oils promote health without any additives. Designed for today's kitchens, they bring natural goodness to every meal.</p>
<h3>Every day, nutrition matters.</h3>
<p>Jivo ensures that daily nutrition is simple and sustainable. Our products are easy to use but never compromise on health, making it effortless to nourish your body. Enjoy the benefits of convenience without sacrificing long-term wellness.</p>
<h3>By you, we mean everyone.</h3>
<p>Jivo's cooking oils are crafted to provide balanced nutrition for the entire family. From kids to grandparents, our oils support healthy living for all. We aim to help families live healthier, together, with Jivo.</p>
<h2>Get in touch</h2>
<p>Email: <a href="mailto:info@jivo.in">info@jivo.in</a><br/>For purchase and order-tracking related queries: <a href="tel:+918595349565">+91 8595 349 565</a><br/>A-35/1, Industrial Area Phase 1, Mayapuri, New Delhi – 110064</p>
`,
  },
  {
    slug: "refund_returns",
    title: "Refund and Returns Policy",
    seoDescription: "Jivo Mart refund, replacement and cancellation policy for food products.",
    bodyHtml: `
<h2>Returns and refunds</h2>
<p>Once an order is placed, the item is <strong>non-refundable</strong> because our products are consumable (food) items.</p>
<h2>Damaged or unusable products</h2>
<p>If a product arrives damaged or unusable, we will <strong>replace the order</strong>. A refund is not given. The replacement is only possible if you inform us within <strong>24–48 hours of delivery</strong>. Email <a href="mailto:info@jivo.in">info@jivo.in</a> with your order number and photos of the damage.</p>
<h2>Cancellations</h2>
<p>An order cannot be cancelled once it is placed. Any updates or requests about an order can be sent to <a href="mailto:info@jivo.in">info@jivo.in</a>.</p>
<h2>Changing the shipping address</h2>
<p>You can change the shipping address and contact details as long as the order has not yet been dispatched. Email customer service at <a href="mailto:info@jivo.in">info@jivo.in</a> with your order number and the new address.</p>
<h2>Quality</h2>
<p>All Jivo products are tested for functionality and durability. In the unlikely case that a product is faulty, contact the Customer Care team at <a href="mailto:info@jivo.in">info@jivo.in</a> and they will work to resolve the issue promptly.</p>
`,
  },
  {
    slug: "shipping-policy",
    title: "Shipping Policy",
    seoDescription: "How and when Jivo Mart ships your order across India.",
    bodyHtml: `
<h2>Delivery days</h2>
<p>Orders are shipped and delivered on working days only. Orders are not shipped or delivered on weekends or public holidays.</p>
<h2>Shipping charges</h2>
<p>Shipping charges are calculated at checkout based on your delivery PIN code. Orders above the free-shipping limit shown in your cart are delivered free of charge.</p>
<h2>Estimated delivery</h2>
<p>Most orders are delivered within 1–5 working days after dispatch. Delivery to remote areas can take longer.</p>
<h2>Tracking</h2>
<p>A shipment confirmation email with the tracking number is sent once your order ships. You can also enter your order number and billing email on the <a href="/track-order/">Track order</a> page at any time.</p>
<h2>Address changes</h2>
<p>The shipping address can be changed until the order is dispatched by emailing <a href="mailto:info@jivo.in">info@jivo.in</a> with your order number.</p>
`,
  },
  {
    slug: "terms-conditions",
    title: "Terms & Conditions",
    seoDescription: "Terms and conditions for shopping on Jivo Mart.",
    bodyHtml: `
<p>These terms apply to every purchase made on shop.jivo.in, operated by Jivo Mart Pvt. Ltd. (a Jivo Wellness company), New Delhi, India. By placing an order you agree to them.</p>
<h2>Orders and prices</h2>
<ul>
<li>All prices are in Indian Rupees and include all applicable taxes. Prices and offers can change without notice; the price shown at the time of checkout is the price charged.</li>
<li>An order is confirmed only after the payment has been received and verified. You will receive an order confirmation email.</li>
<li>We may refuse or cancel an order where a product is unavailable, a price was shown incorrectly, or payment could not be verified. Any amount already paid will be refunded to the original payment method.</li>
</ul>
<h2>Payments</h2>
<p>Payments are processed securely by Razorpay (cards, UPI, net banking and EMI options). Jivo Mart never stores your card details.</p>
<h2>Coupons</h2>
<p>Coupon codes are subject to their own conditions (minimum order value, validity period, one use per order) and cannot be exchanged for cash.</p>
<h2>Delivery, returns and cancellations</h2>
<p>See our <a href="/shipping-policy/">Shipping Policy</a> and <a href="/refund_returns/">Refund and Returns Policy</a>. Food products are non-refundable; damaged items are replaced when reported within 24–48 hours of delivery.</p>
<h2>Accounts</h2>
<p>You are responsible for keeping your account password private and for all activity under your account.</p>
<h2>Content</h2>
<p>All text, images, logos and videos on this website belong to Jivo Wellness Pvt. Ltd. and may not be copied without written permission.</p>
<h2>Law</h2>
<p>These terms are governed by the laws of India. Disputes are subject to the courts of New Delhi.</p>
<h2>Contact</h2>
<p>Jivo Mart Pvt. Ltd., A-35/1, Industrial Area Phase 1, Mayapuri, New Delhi – 110064. Email <a href="mailto:info@jivo.in">info@jivo.in</a>, phone <a href="tel:+918595349565">+91 8595 349 565</a>.</p>
`,
  },
  {
    slug: "disclaimer",
    title: "Disclaimer",
    seoDescription: "Product information disclaimer for Jivo Mart.",
    bodyHtml: `
<p>Actual product packaging and materials may contain more and different information than what is shown on our app or website. We recommend that you do not rely solely on the information presented and that you always read labels, warnings, and directions before using or consuming a product.</p>
<p>The health benefits described on this website are general nutrition information and are not medical advice. Please consult a doctor or dietitian for advice about your personal health.</p>
`,
  },
];
