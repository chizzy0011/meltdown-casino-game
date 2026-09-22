# Meltdown: Overclock Protocol — Chain Jam Vol. 1 submission

Copy-paste blocks for the jam.chain.wtf form and the DoraHacks BUIDL.

---

## Vision
Meltdown turns probability into a machine you operate. Most casino games hand you
a lever and hide the math behind an animation — you pull, it decides. Meltdown
puts your hand on the throttle of an unstable quantum processor and makes every
gigahertz a decision: push the clock higher for a bigger multiplier, bank the pot
while you're ahead, or spend a one-shot cryo-coolant to survive one deadly spike.
The tension isn't a reel spinning — it's a rig heating up under your command until
you either harvest or blow it. The goal: prove a genuinely new, provably-fair
on-chain wagering primitive — a discrete hardware-overclock ladder with a tactical
safeguard — that stands on its own as a repeatable casino genre, in line with
Chain's mission of open, creator-owned casino gaming.

---

## Project name
Meltdown: Overclock Protocol

## Tagline
Hardware push-your-luck: overclock a quantum chip to 250x — or melt down.

## Game URL (live, standalone playable demo)
https://meltdown-overclock.vercel.app

## Declared RTP
96  (exactly 96.0%, proven by `npm test` — within the 93–98% band)

## Source access (public repo)
https://github.com/chizzy0011/meltdown-casino-game

## Public builder profile
https://github.com/chizzy0011

## Socials (fill your own handles)
- X:        @__________
- Discord:  __________
- Telegram: @__________

## Pitch / info (also the gallery card copy)
Overclock an unstable quantum processor tier by tier from 1.05x to 250x as core
temp and turbine whine climb — bank the pot or push higher, and deploy one-shot
cryo-coolant to survive the next spike before a catastrophic core meltdown.

---

## Short description (what it does)
Meltdown is an original hardware push-your-luck wagering game on the official Chain
Casino SDK. You command an unstable quantum mining processor: each PUSH overclocks
it to the next frequency tier (3.2 → 36.0 GHz), raising both the payout multiplier
(1.05x → 250x) and the risk of a catastrophic core meltdown. HARVEST banks your
current multiplier at any time. Once per round, INJECT CRYO arms a one-shot coolant
that guarantees survival on the very next push for a permanent 15% cut of the pot.
A 60 FPS canvas processor die glows from cyan through amber to plasma-violet, with
live telemetry (clock speed, core temp, fan RPM, pot) and a fully procedural Web
Audio engine — zero external assets.

## Why it's novel (not a clone)
No blackjack, dice, plinko, limbo, or continuous crash curve. Meltdown is a
DISCRETE overclock risk ladder — every step is a distinct thermal/acoustic/
multiplier event — plus the Cryo-Coolant safeguard, a high-agency decision with no
analogue in standard casino games. Outcomes are driven by player choices (how far
to push, when to bank, whether to spend cryo), not a single passive reveal.

## How it uses Chain (the Casino SDK)
Settlement is 100% on-chain via a stateless `ICasinoGameV2` contract; the frontend
holds no wallet code and talks to the host through the `@chain/casino-sdk`
`connectGameToHost` bridge, rendering from host state snapshots. It's a multi-action
(mines-shape) game: `onSessionStart` → `onPlayerAction` (push / cryo / harvest) →
`onRandomness`, with a legitimate `quoteForfeitPayout` for abandoned sessions.
Randomness comes from the casino facet's VRF; the contract derives outcomes with
unbiased rejection sampling (never modulo bias).

## Provably fair — exact 96% RTP
A telescoping cumulative-survival model: on a push to tier k the contract draws a
uniform roll in [0, C[k-1]) and survives iff roll < C[k], so P(reach k) = C[k].
Multipliers are set so C[k] · mult[k] = 0.96 for every target tier — an exact 96.0%
RTP that matches the declared paytable. Proven by an automated suite (`npm test`)
both algebraically (C[k]·mult[k] == 0.96) and via Monte Carlo, plus a behaviour
guard asserting a blown core pays exactly zero.

## Technical credibility (validated in the SDK local simulator)
- `MeltdownGame.sol` implements the canonical `ICasinoGameV2` and compiles clean on
  solc 0.8.30.
- End-to-end verified: `npm start` compiled, deployed and registered MeltdownGame on
  the local chain against a real VRF node; on-chain sessions settle correctly
  (survive advances a tier, meltdown pays 0, harvest banks the multiplier).
- Guest static build passes (`vite build`); manifest passes the SDK validator
  (`ok: true`); the Chain Jam widget is live on the page.
- Playable standalone outside the iframe via a demo host that mirrors the contract.
- Ships a one-command deploy handoff kit (committed ABI + bytecode + viem deploy
  script), live-tested against the local chain.

## Tech stack
Solidity (ICasinoGameV2), Chain Casino SDK (@chain/casino-sdk), viem, penpal bridge,
vanilla JS, HTML5 Canvas, Web Audio API, Vite, Vercel.

## What was built during the jam
The whole game, from scratch on the real SDK: conformant contract (telescoping 96%
RTP + rejection-sampled VRF), the bridge integration and snapshot-driven controller,
60 FPS canvas renderer, procedural Web Audio engine, v1 manifest, jam widget,
standalone demo host, exact-RTP + behaviour test suites, deploy handoff kit; then
validated in the simulator, hosted the live demo, and published the source.

## What's next
On-chain leaderboards and persistent miner ranks; a provably-fair panel surfacing
the VRF proof per push; seasonal thermal skins; a spectator "last blowouts" feed;
and integration into the chain.wtf catalog for the 25% lifetime revenue share.

## On-chain deployment
No public "target chain" is defined in the jam SDK, and whitelisting on
`CasinoGameFacet` is a governance action performed by the Chain.wtf maintainers at
integration. The audited contract source (`simulator/contracts/MeltdownGame.sol`)
and a deploy-ready artifact + one-command deploy script (`examples/meltdown-public/
deploy/`) are provided so deployment is a single step at integration time.

## Demo video
TODO — record ~60–90s screen capture of the live demo (overclock → arm cryo →
harvest, then a meltdown), upload to YouTube, paste the link.

## Payout / rev-share wallet
Provide a fresh, secure wallet able to receive the game's revenue share. Do not use
a development deployer wallet.
