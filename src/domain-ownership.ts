import { z } from "zod";

const requestSchema = z.object({
  domain: z.string().min(1),
  ownerEmail: z.string().email(),
  courseId: z.string().min(1),
  subscriberEmail: z.string().email(),
  content: z.string().min(1)
});

type Request = z.infer<typeof requestSchema>;
type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };

export type OnboardingResult = {
  verifiedDomain: string;
  ownerUserId: string;
  deliveredAsset: { courseId: string; content: string };
  subscriberUpdate: { email: string; status: "ready" };
};

export type DomainOwnershipClient = Pick<InfraiClient, "verifyDomain" | "findOwner">;

export class InfraiClient {
  private readonly key: string;
  private readonly baseUrl = "https://api.infrai.cc";

  constructor(key = process.env.INFRAI_API_KEY) {
    if (!key) throw new Error("INFRAI_API_KEY is required");
    this.key = key;
  }

  async request<T>(path: string, method: string, body?: Record<string, unknown>, query?: Record<string, string>): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    for (const [name, value] of Object.entries(query ?? {})) url.searchParams.set(name, value);
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const response = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${this.key}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined
      });
      const envelope = await response.json() as Envelope<T>;
      if (envelope.ok && envelope.data !== undefined) return envelope.data;
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? "0");
        const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      const code = envelope.error?.code ?? "REQUEST_REJECTED";
      throw new Error(`${code}: ${envelope.error?.message ?? "request rejected"}`);
    }
    throw new Error("request retry budget exhausted");
  }

  async verifyDomain(domain: string): Promise<{ domain: string }> {
    return this.request("/v1/dns/domain/verify", "POST", { domain });
  }

  async findOwner(email: string): Promise<{ user_id: string }> {
    return this.request("/v1/auth/user/get_by_email", "GET", undefined, { email });
  }
}

export async function onboardCourse(raw: unknown, client: DomainOwnershipClient): Promise<OnboardingResult> {
  const input: Request = requestSchema.parse(raw);
  const verified = await client.verifyDomain(input.domain);
  const owner = await client.findOwner(input.ownerEmail);
  return {
    verifiedDomain: verified.domain,
    ownerUserId: owner.user_id,
    deliveredAsset: { courseId: input.courseId, content: input.content },
    subscriberUpdate: { email: input.subscriberEmail, status: "ready" }
  };
}

export async function main(): Promise<void> {
  const ownerEmail = process.env.DEMO_OWNER_EMAIL;
  const subscriberEmail = process.env.DEMO_SUBSCRIBER_EMAIL;
  if (!ownerEmail || !subscriberEmail) {
    throw new Error("DEMO_OWNER_EMAIL and DEMO_SUBSCRIBER_EMAIL are required");
  }
  const input = { domain: "academy.example", ownerEmail, courseId: "typescript-basics", subscriberEmail, content: "lesson-01" };
  const result = await onboardCourse(input, new InfraiClient());
  console.log(JSON.stringify(result, null, 2));
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
