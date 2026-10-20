# 06 — Realtime, Concurrency, and Security

## Security model
The public can **request** a mutation; only the server may **decide and write** its result. Anonymous login is allowed for low friction, but anonymous is not equivalent to trusted.

## Supabase rules
- Enable RLS on `world_state`, `world_events`, and all quota tables.
- Allow anonymous/authenticated **SELECT** of sanitized world state and public events only.
- Deny direct `INSERT`, `UPDATE`, `DELETE` for browser roles on canonical state/events.
- Edge Function uses service credentials from server-side secret storage only, not `VITE_` variables.
- Make transactional commit RPC private and grant execution **only** to the backend role (never `anon` or normal `authenticated`).
- If a SQL `SECURITY DEFINER` function is used, fix `search_path`, validate caller and inputs, and restrict `EXECUTE` grants explicitly.

## Transaction flow
1. Edge endpoint verifies anonymous-session JWT and rejects oversized/malformed payloads.
2. Apply per-subject rate limiting, plus coarse per-IP protections at edge/WAF level where allowed by privacy policy.
3. Validate the action and obtain canonical world snapshot.
4. Compute the candidate transition with the server mutation reducer.
5. Call an **atomic SQL commit function** that checks current revision, inserts event, and updates world state within one transaction. The function must enforce idempotency and ownership.
6. On revision mismatch, reload latest state and recompute; retry up to 3 times.
7. Publish event only **after commit**. Return revision/event id.

Using two independent client-side Supabase statements (update world, then insert event) is forbidden: partial success can corrupt replay.

## Realtime consistency
- Server revision is the sequence number; time is not a substitute for order.
- Realtime messages may arrive twice, out of order, or be dropped.
- Dedupe by `eventId`, apply contiguous revisions only, and re-fetch on gaps.
- Reconnect must first ensure an active subscription (or buffer events), fetch an authoritative snapshot, and apply newer queued notifications safely.
- Do not promise hard realtime latency; **target** new mutation visibility under 2s at p95 in normal conditions.

## Rate limits (initial policy, adjust with load tests)
- At most **6 canonical mutation requests / minute per anonymous session**.
- Global application ceiling adjustable for traffic spikes; reject with `429` and `Retry-After`.
- 1 KB maximum request size, strict action allowlist, body shape validation.
- A per-minute scheduled idle growth event bypasses user quota but must have job authorization and unique idempotency token.
- No freeform text, HTML, URLs, file uploads, custom sprite code, or executable input accepted.

## Anti-abuse and availability
- Require an anonymous auth token rather than solely using localStorage identifiers for rate limiting.
- Add CAPTCHA/challenge only if actual abuse appears.
- Protect owner-only reset with admin authorization and audit log.
- On suspicious bursts, switch to temporary **read-only mode**; do not erase the world.
- Snapshot/version backups; provide admin recovery without deleting the event audit trail.
- Never display identifiable user data publicly; aggregate only minimal interaction metadata.

## Privacy
Local prototype stores world simulation state in browser localStorage, not personal information. Production store may have temporary anti-abuse identifiers; document retention, legal basis, and a privacy notice before launch. Avoid third-party tracking by default.

## Threat scenarios
| Threat | Mitigation |
| --- | --- |
| Public user submits giant or invalid entity array | Endpoint accepts intents only |
| Bot sends 1,000 clicks/sec | JWT + rate limits + global cap |
| Concurrent clicks overwrite one another | Compare-and-swap or row lock + atomic commit |
| Duplicate POST via reconnect | Per-client idempotency key |
| Client modifies local revision | Ignore claimed revision as authority |
| Abusive or offensive content | No public text or custom sprite upload |
| Service key leaked to client bundle | CI secret scan, server-only runtime, env separation |
