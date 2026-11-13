import assert from "node:assert/strict";
import { onboardCourse } from "./domain-ownership.ts";

const calls: Array<{ path: string; method: string; query?: Record<string, string> }> = [];
const client = {
  verifyDomain: async (domain: string) => { calls.push({ path: "/v1/dns/domain/verify", method: "POST" }); return { domain }; },
  findOwner: async (email: string) => { calls.push({ path: "/v1/auth/user/get_by_email", method: "GET", query: { email } }); return { user_id: "user-42" }; }
};

const result = await onboardCourse({
  domain: "school.example",
  ownerEmail: "teacher@school.example",
  courseId: "course-1",
  subscriberEmail: "learner@example.net",
  content: "chapter-1"
}, client);

assert.equal(result.ownerUserId, "user-42");
assert.equal(result.verifiedDomain, "school.example");
assert.equal(result.subscriberUpdate.status, "ready");
assert.deepEqual(calls.map(({ path, method }) => ({ path, method })), [
  { path: "/v1/dns/domain/verify", method: "POST" },
  { path: "/v1/auth/user/get_by_email", method: "GET" }
]);
console.log("domain decision passed");
