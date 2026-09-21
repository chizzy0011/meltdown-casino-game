# Meltdown: Overclock Protocol — Chain Jam Vol. 1 Submission

## What it is
An original **hardware push-your-luck** wagering game on the official Chain Casino SDK. Overclock an
unstable quantum processor tier by tier (1.05x → **250x**); each PUSH consumes on-chain VRF,
surviving advances a tier, failing is a meltdown. HARVEST banks the pot anytime; a one-shot
**Cryo-Coolant** guarantees the next push for a 15% pot penalty. Discrete tiers + the Cryo agency
mechanic distinguish it from crash / dice / plinko.

## Eligibility — verified

| Gate | Status | Evidence |
| --- | --- | --- |
| Implements `ICasinoGameV2` (contract) | ✅ | `simulator/contracts/MeltdownGame.sol` — compiles clean on **solc 0.8.30**; exposes `quoteCaps`, `quoteRiskParams`, `onSessionStart`, `onPlayerAction`, `onRandomness`, `quoteForfeitPayout` |
| `@chain/casino-sdk` bridge | ✅ | `src/host.js` uses `connectGameToHost`; guest is snapshot-driven, no wallet code |
| Manifest (v1) | ✅ | `public/game.manifest.json` — passes `validateCasinoGameManifest` (`ok:true`); served at `/game.manifest.json` |
| Runs in local simulator | ✅ | `npm start` → local node **compiled, deployed and registered** `MeltdownGame` (`deployed.json`: `MeltdownGame @ 0xa513e6e4…`) |
| RTP 93–98%, declared = paytable | ✅ | **96.0%** (96.6% tier 1); proven by `npm run test:rtp` (`C[k]·mult[k]==0.96` + Monte Carlo) |
| Standalone playable demo | ✅ | demo host in `src/host.js`; open the guest directly or `?demo=1` |
| Jam widget on the page | ✅ | `<script async src="https://jam.chain.wtf/widget.js">` in `index.html` |
| Multi-action + recovery | ✅ | manifest `submitAction`, `forfeitExpiredSession`, `cancelStuckRandomness`; `quoteForfeitPayout` returns cash-out from revealed state |
| Guest build | ✅ | `vite build` → 467 modules, ~59 kB |

## Contract design (multi-action, mines-shape)
Stateless `SessionContext → StepResult` state machine. Telescoping cumulative-survival: on a push to
tier *k* draw a uniform roll in `[0, CUM[k-1])` (unbiased rejection sampling) and survive iff
`roll < CUM[k]`, so `P(reach k) = CUM[k]` and `mult[k] = round(0.96 / CUM[k])`. House reserves the
full 250x path at `onSessionStart`; payout caps exactly at `stake + reservedProfit`.

## Run
```sh
# Full local stack (chain + VRF + host simulator + game)
cd sdk/casino-sdk && npm install && npm start      # simulator :3300, Meltdown :3200

# Standalone demo (no chain)
cd sdk/casino-sdk/examples/meltdown-public && npm install && npm run dev   # :3200

# RTP proof
npm run test:rtp
```
> First `npm start` on a cold cache: Hardhat + solc init can exceed the local-node's 60s readiness
> probe. If it reports "Hardhat node did not become ready", just run `npm start` again (warm cache),
> or ensure nothing else already holds port `8545`/`3300` (e.g. another SDK stack).

## Deliverables to the Chain team
1. Audited `MeltdownGame` contract deployed on the target chain (address TBD).
2. Static build of `examples/meltdown-public` at a stable HTTPS URL with `game.manifest.json`
   same-origin, jam widget live.
