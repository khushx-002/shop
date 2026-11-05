/**
 * Tiny fake Razorpay REST API for the e2e payment test (orders, payments, capture).
 * Based on the checkout teammate's scratch mock. The site under test must be started with
 *   RAZORPAY_API_BASE=http://127.0.0.1:<port>  NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_x  RAZORPAY_KEY_SECRET=<same as E2E_RAZORPAY_KEY_SECRET>
 */
import http from "node:http";

export type MockPayment = { id: string; order_id: string; amount: number; currency: "INR"; status: "authorized" | "captured" | "failed" };
type MockOrder = { id: string; amount: number; currency: string; receipt: string | null; notes?: Record<string, string>; status: string };

export async function startMockRazorpay(port = 3199) {
  const orders = new Map<string, MockOrder>();
  const payments = new Map<string, MockPayment>();
  const send = (res: http.ServerResponse, code: number, obj: unknown) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(JSON.stringify(obj));
  };
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let j: Record<string, unknown> = {};
      try {
        j = body ? JSON.parse(body) : {};
      } catch {
        return send(res, 400, { error: { description: "bad json" } });
      }
      if (!(req.headers.authorization || "").startsWith("Basic ")) return send(res, 401, { error: { description: "Authentication failed" } });
      if (req.url === "/v1/orders" && req.method === "POST") {
        const o: MockOrder = { id: `order_${Math.random().toString(36).slice(2, 16).padEnd(14, "x")}`, amount: Number(j.amount), currency: String(j.currency), receipt: (j.receipt as string) ?? null, notes: j.notes as Record<string, string>, status: "created" };
        orders.set(o.id, o);
        return send(res, 200, o);
      }
      let m = /^\/v1\/payments\/([^/]+)$/.exec(req.url ?? "");
      if (m && req.method === "GET") {
        const p = payments.get(decodeURIComponent(m[1]));
        return p ? send(res, 200, p) : send(res, 400, { error: { description: "The id provided does not exist" } });
      }
      m = /^\/v1\/payments\/([^/]+)\/capture$/.exec(req.url ?? "");
      if (m && req.method === "POST") {
        const p = payments.get(decodeURIComponent(m[1]));
        if (!p || p.amount !== j.amount) return send(res, 400, { error: { description: "bad capture" } });
        p.status = "captured";
        return send(res, 200, p);
      }
      send(res, 404, { error: { description: "not found" } });
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
  return {
    url: `http://127.0.0.1:${port}`,
    orders,
    /** What the Razorpay popup would do when the customer pays. */
    addPayment(p: MockPayment) {
      payments.set(p.id, p);
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
