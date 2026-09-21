# Meltdown: Overclock Protocol ⚡

[![Chain Jam Vol. 1](https://img.shields.io/badge/Chain%20Jam-Vol.%201%20Entry-ffaa00?style=for-the-badge)](https://jam.chain.wtf)
[![RTP](https://img.shields.io/badge/RTP-96.00%25-00ff66?style=for-the-badge)](#-mathematical-model--exact-960-rtp)
[![ICasinoGameV2](https://img.shields.io/badge/Chain%20Casino%20SDK-ICasinoGameV2-00f0ff?style=for-the-badge)](./sdk/casino-sdk/simulator/contracts/MeltdownGame.sol)

> **Meltdown** is an original hardware push-your-luck wagering game built on the official
> **Chain Casino SDK** (`@chain/casino-sdk`) for **Chain Jam Vol. 1**. Overclock an unstable quantum
> processor tier by tier — from **2.0 GHz up to 36.0 GHz (250x)** — managing thermal risk and a
> tactical Cryo-Coolant safeguard before a catastrophic core meltdown.

A **multi-action** casino game (the mines shape): the session stays open across pushes, each
optionally consuming on-chain VRF. The frontend has **no wallet code** — the host signs every
transaction and streams state snapshots into the game iframe.

---

## 🎮 Play

- **Standalone demo** (no chain): `examples/meltdown-public` → `npm run dev` → http://localhost:3200
- **Full local stack** (chain + VRF + host): see [How to run](#-how-to-run).

---

## ✅ Eligibility at a glance

| Requirement | Where |
| --- | --- |
| `ICasinoGameV2` contract (`quoteCaps`, `quoteRiskParams`, `onSessionStart`, `onPlayerAction`, `onRandomness`, `quoteForfeitPayout`) | [`MeltdownGame.sol`](./sdk/casino-sdk/simulator/contracts/MeltdownGame.sol) |
| `@chain/casino-sdk` bridge (`connectGameToHost`) | [`src/host.js`](./sdk/casino-sdk/examples/meltdown-public/src/host.js) |
| v1 `game.manifest.json` | [`public/game.manifest.json`](./sdk/casino-sdk/examples/meltdown-public/public/game.manifest.json) |
| Runs in the local simulator | `cd sdk/casino-sdk && npm start` |
| RTP in 93–98%, declared math = paytable | **96.0%**, proven by `npm run test:rtp` |
| Standalone playable demo outside the iframe | demo host, `?demo=1` |
| Jam widget on the page | `<script async src="https://jam.chain.wtf/widget.js">` in `index.html` |
| Novel concept (no clones) | discrete overclock ladder + Cryo safeguard |

---

## ⚖️ Mathematical Model — Exact 96.0% RTP

Telescoping cumulative-survival curve. On a push to tier *k* the contract draws a uniform roll in
`[0, C[k-1])` (unbiased rejection sampling) and survives iff `roll < C[k]`, so
`P(reach tier k) = C[k]`. With `M[k] = round(0.96 / C[k])`:

| Tier | Clock | Cumulative `C` | Multiplier | Tier | Clock | Cumulative `C` | Multiplier |
| :--: | :--: | :--: | :--: | :--: | :--: | :--: | :--: |
| 1 | 3.2 GHz | 92.00% | 1.05x | 6 | 14.0 GHz | 16.00% | 6.00x |
| 2 | 4.8 GHz | 80.00% | 1.20x | 7 | 20.0 GHz | 6.00% | 16.00x |
| 3 | 6.4 GHz | 64.00% | 1.50x | 8 | 28.0 GHz | 1.20% | 80.00x |
| 4 | 8.2 GHz | 48.00% | 2.00x | 9 | 36.0 GHz | 0.384% | 250.00x |
| 5 | 10.5 GHz | 32.00% | 3.00x | | | | |

`E[payout | target k] = C[k] · M[k] = 0.96 × wager` for every tier (tier 1 = 0.966 by the
deliberate 1.05x rounding). **❄️ Cryo-Coolant:** once per round, guarantee the next push for a
permanent 15% pot penalty.

```sh
cd sdk/casino-sdk/examples/meltdown-public && npm run test:rtp
```

---

## 🛠️ Structure

```
Meltdown/
├── sdk/casino-sdk/                          # vendored official Chain Casino SDK
│   ├── simulator/contracts/
│   │   ├── ICasinoGameV2.sol                # canonical interface (SDK)
│   │   └── MeltdownGame.sol                 # ← our on-chain game (ICasinoGameV2)
│   └── examples/meltdown-public/            # ← our guest frontend
│       ├── index.html                       # UI + jam widget
│       ├── public/game.manifest.json        # v1 manifest
│       ├── test/rtp.mjs                      # exact-RTP proof
│       └── src/
│           ├── host.js                       # connectGameToHost + standalone demo host
│           ├── main.js                       # snapshot-driven controller
│           ├── engine/meltdown_math.js       # shared paytable data
│           ├── render/core_renderer.js       # 60 FPS Canvas processor die
│           └── audio/overclock_audio.js      # Web Audio synth
├── GAME_OVERVIEW.md
└── README.md
```

---

## 🚀 How to run

**Full local stack** (in-memory chain + real VRF node + host simulator + game):
```sh
cd sdk/casino-sdk
npm install
npm start          # simulator :3300, Meltdown guest :3200
```
Open **http://localhost:3300**. The local node auto-compiles and deploys `MeltdownGame.sol` (no
constructor args) and the simulator mounts the Meltdown iframe.

**Standalone demo** (no chain, play-money):
```sh
cd sdk/casino-sdk/examples/meltdown-public
npm install
npm run dev        # http://localhost:3200
```

---

## 📜 License
MIT © 2026 Chain Jam Dev Team
