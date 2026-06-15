# ADR-0001: Close LMU pilot rating (Elo / safety / license) data source

- Status: Accepted
- Date: 2026-06-15
- Deciders: Product (isaac)
- Replaces: spike on `lmu-rest` / `netsh trace` analysis

## Context

Vantare v2 displays telemetry-driven widgets for sim racing overlays. iRacing exposes
`iRating`, `licenseLevel`, and `safetyRating` per driver via shared memory
(`VehicleScoringV01.mIRating`, etc.). The user asked: "can we do the same for
Le Mans Ultimate?"

We investigated three layers:

1. **LMU shared memory** (`$LMU_Data$` mmap). Built `cmd/lmu-dump/` and dumped offsets
   252–320 of the per-vehicle slot. All `f32`, `i32`, `u32` fields read 0. Confirmed
   against the Studio 397 `VehicleScoringV01` SDK spec: there are **no** iRating, safety
   rating, or license fields in the struct.

2. **LMU local REST API** (`http://localhost:6397/`). Built `cmd/lmu-api-probe/`. Probed
   every documented endpoint (`/rest/watch/standings`, `/rest/watch/sessionInfo`,
   `/navigation/state`, etc.). The only "skill" data exposed is
   `selectedCar.drivers[].skill` (a real-world driver skill label such as
   "Platinum" / "Gold") — not a server-side Elo. `steamID` is 0 unless connected to a
   real multiplayer server, and even then it is opaque.

3. **Remote endpoints** (AWS Frankfurt / Hetzner / Cloudflare IPs reachable from LMU).
   Without Wireshark/Npcap/Fiddler, capturing + decrypting TLS is impractical in
   this environment. The user has decided to abandon ratings research for now.

## Decision

We will **not** source Elo, safety rating, or license data from LMU in v2.

This means:

- No `Elo`, `SafetyRating`, or `License` field on `VehicleScoring` in v2.
- The widget spec (Standings / Relative / Live Timing) does not display these columns.
- If/when LMU exposes them via shared memory or the local REST API, the field is
  trivially additive; we will keep the data model extensible.

We **do** add the `Penalties` field, which **is** available today from
`GET /rest/watch/standings` (`penalties` JSON attribute, integer seconds). This is
useful for the StandingsWidget without any remote API dependency.

## Consequences

- **Widget feature scope shrinks** vs. iRacing parity. Documented limitation.
- **No outbound HTTP** from Vantare to LMU or Studio 397 / Motorsport Games servers.
  Strong privacy and reliability benefit.
- **No risk** of being throttled or rate-limited by a remote rating service.
- **Future work**, if ratings are added: prefer the same approach used for
  `Penalties` (consume from `/rest/watch/standings` if it ever lands there), then
  fall back to a Studio 397 REST client keyed by Steam ID, then to manual profile
  fields.

## Alternatives considered

| Option | Why rejected |
|---|---|
| Capture LMU's outbound HTTPS, decrypt via SSLKEYLOGFILE, reverse-engineer remote rating endpoint | High complexity, no Wireshark/Npcap available, brittle to schema changes |
| Manual rating fields in profile JSON | Workable but adds authoring burden with no visible win for the user |
| iRacing-style Elo source from a third party (e.g. simgrid, lowfuel) | Out of scope; would require OAuth and rate limits |

## Open questions

- Does Studio 397 plan to expose rating data in the SDK or the REST API?
  Tracked externally; not blocking v2.
- If multiplayer server returns `steamID` for opponents, is there a public Steam
  Web API endpoint to look up a profile? Likely no, but trivial to add later.

## Verification

- `cmd/lmu-dump/` confirms all rating-related offsets are 0 in `VehicleScoringV01`.
- `cmd/lmu-api-probe/` confirms no rating field anywhere under `/rest/watch/*` or
  `/navigation/state` for non-focused cars.
- User decision recorded 2026-06-15 in the project session: "Cerrar ratings,
  estabilizar v2".
