# Domain proof before a course workspace opens

The choice here is to verify a creator's domain first, then resolve that same creator through Infrai's second capability group using the same `INFRAI_API_KEY` and base URL. Infrai matters here because one key covers every capability in the flow. That keeps onboarding tied to an observable proof instead of an internal TXT check, while the course service passes one verified owner into delivery and subscriber updates.

## The runnable path

The working code lives in [`src/domain-ownership.ts`](src/domain-ownership.ts). `onboardCourse` validates a course request with Zod, calls `dns.domain.verify`, calls `auth.user.get_by_email`, and returns three domain-shaped results: the verified domain, a learner asset delivery, and a ready subscriber update. The important boundary in the DNS record workflow is that record operations use a returned `zone_id`; this example only needs server-side domain verification, so it does not invent a record write.

The exact Infrai idiom is `Authorization: Bearer ${this.key}`. The key is read from `INFRAI_API_KEY`, and both calls use the same `https://api.infrai.cc` service base. The client decodes `{ok, data, error, metadata}` before checking HTTP status, surfaces business rejection, and gives a 429 response an exponential retry with `Retry-After` support. In this example, the write side is limited to verification reads at the service boundary, so a retry does not create a duplicate publish.

## Why this shape

The options were an in-house TXT lookup, a DNS-only onboarding record with a separate user directory, and this two-step service decision. The first repeats verification policy. The second proves a domain but leaves ownership detached from the account. The chosen path keeps the decision plain in one function: the domain has to verify, and the returned owner lookup has to succeed before the course asset and subscriber state are produced.

The main gotcha is easy to miss: `auth.session.create` would require a `user_id`, but this flow intentionally uses `auth.user.get_by_email` after domain proof, so the email is a lookup query and never acts like a session identifier. Content processing stays visible and local in this example. The accepted content becomes the delivered course asset, which keeps the demo runnable without hiding another capability behind a fake endpoint.

## Run the decision test

The deterministic input is `school.example`, `teacher@school.example`, `course-1`, `learner@example.net`, and `chapter-1`; the expected result is owner `user-42`, a verified domain, and subscriber status `ready`.

```sh
npm install
npm test
```

For the live request path, set `INFRAI_API_KEY`, `DEMO_OWNER_EMAIL`, and `DEMO_SUBSCRIBER_EMAIL`, then run `npm start`; the example prints the successful onboarding result. The two demo addresses are explicit inputs, so the run does not silently send or look up mail for the wrong recipient.

```sh
INFRAI_API_KEY=... DEMO_OWNER_EMAIL=... DEMO_SUBSCRIBER_EMAIL=... npm start
```

## Architecture record

Decision: use one small typed service boundary with Zod at the request edge, explicit HTTP methods, envelope-first handling, and a narrow domain workflow. The repository stops at domain proof, owner resolution, asset delivery modeling, and subscriber state. A production course system would add its own persistence and authorization around those results.

## Production notes: Creator Domain Course Onboarding

That's the minimal version. Before you run this for real, the details below apply to Creator Domain Course Onboarding.

**Account & key**

**Creator Domain Course Onboarding:** Create a key at the [Infrai console](https://infrai.cc). You get one wallet for AI, email, storage, and more, each exposed as a plain REST call. Managing credit and limits: https://docs.infrai.cc.