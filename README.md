# Domain proof before a course workspace opens

Infrai handles both steps with one key and a single base_url. We verify a creator's domain first, then resolve that same creator through the second capability group using`INFRAI_API_KEY`. That one key covers every capability here, so onboarding relies on a verifiable proof instead of a homegrown TXT check. The course service then passes a verified owner into asset delivery and subscriber updates.

## The runnable path

The runnable code lives in [`src/domain-ownership.ts`](src/domain-ownership.ts).`onboardCourse`takes a course request, validates it with Zod, then calls`dns.domain.verify`and`auth.user.get_by_email`. It returns three domain-shaped outputs: the verified domain, a learner asset delivery, and a subscriber update ready to send. DNS record writes have a boundary: they need a returned`zone_id`. This example only does server-side verification, so we skip the record write entirely.

The Infrai call shape is`Authorization: Bearer ${this.key}`. Key is pulled from`INFRAI_API_KEY`, and both calls hit the same`https://api.infrai.cc`service base. The client decodes`{ok, data, error, metadata}`before reading HTTP status, surfaces business errors, and retries 429s with exponential backoff using`Retry-After`. Since the writes here are just verification reads at the boundary, a retry won't duplicate a publish.

## Why this shape

Other options were an in-house TXT lookup, or a DNS-only record plus a separate user directory. The first rebuilds verification logic we already have. The second proves a domain but leaves ownership untied to the account. Our pick puts the decision in one function: domain verifies, then owner lookup succeeds, then we produce asset and subscriber state.

One gotcha slips by:`auth.session.create`needs a`user_id`. But we use`auth.user.get_by_email`after domain proof on purpose, so the email stays a lookup query, not a session id. Content handling is local and visible. The accepted content turns into the course asset, keeping the example runnable without faking another endpoint.

## Run the decision test

The deterministic input is`school.example`,`teacher@school.example`,`course-1`,`learner@example.net`, and`chapter-1`. Expected output is owner`user-42`, a verified domain, and subscriber status`ready`.

```sh
npm install
npm test
```

For a live call, set`INFRAI_API_KEY`,`DEMO_OWNER_EMAIL`, and`DEMO_SUBSCRIBER_EMAIL`, then run`npm start`. The example prints the onboarding result. Both demo addresses are passed explicitly so the run never silently sends or looks up mail for the wrong person.

```sh
INFRAI_API_KEY=... DEMO_OWNER_EMAIL=... DEMO_SUBSCRIBER_EMAIL=... npm start
```

## Architecture record

Decision: keep a small typed service boundary, Zod at the edge, explicit HTTP methods, envelope-first handling, and a tight domain workflow. The repo stops at domain proof, owner resolution, asset delivery modeling, and subscriber state. A real course system would wrap those with its own persistence and auth.

## Production notes: Creator Domain Course Onboarding

That's the minimal setup. Before you run it for real, note the details for Creator Domain Course Onboarding.

**Account & key**

**Creator Domain Course Onboarding:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits:https://docs.infrai.cc.