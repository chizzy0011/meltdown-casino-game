# Meltdown: Overclock Protocol ⚡ — Game Overview & Documentation

> **Chain Jam Vol. 1 Official Entry**
> *A Provably Fair Hardware Push-Your-Luck Wagering Game on the Chain Casino SDK*

---

## 🎯 1. The Goal & Aim

**Meltdown** is an original push-your-luck wagering game. The player commands an unstable quantum
mining processor and *overclocks* it one tier at a time — from **2.0 GHz (IDLE)** up to
**36.0 GHz (OVERCLOCK GOD, 250x)**. Every push raises both the payout multiplier and the risk of a
catastrophic core meltdown. Bank the pot at any time, or arm a one-shot Cryo-Coolant safeguard.

### Alignment with the judging criteria
1. **🆕 Novelty:** Not a crash/dice/plinko clone — a discrete hardware-overclock risk ladder with a
   tactical Cryo safeguard (sacrifice 15% of the pot to guarantee the next push).
2. **😃 Fun & Replayability:** Escalating tension — turbine fans spin up, coil whine climbs, heat
   bloom intensifies, and the odds tighten with every gigahertz. Auto-target presets + rank/XP.
3. **🌀 Simplicity:** Set wager → **PUSH CLOCK** → **HARVEST** or push again.
4. **🔊 Visual & Sound:** 60 FPS HTML5 Canvas processor die + a 100% native Web Audio synth, zero
   external assets (instant load).
5. **⚖️ Exact 96.0% RTP:** Mathematically guaranteed across every target tier (see §3).

---

## 🕹️ 2. Core Loop & Paytable

Each **PUSH** attempts the next tier. Surviving advances you; failing is a meltdown (pot lost).
**HARVEST** banks the current multiplier at any time.

| Tier | Clock | Label | Cumulative survival `C` | Multiplier | Core Temp |
| :--: | :---: | :--- | :--: | :--: | :--: |
| 1 | 3.2 GHz | STABLE | 92.000% | **1.05x** | 45°C |
| 2 | 4.8 GHz | TURBO | 80.000% | **1.20x** | 58°C |
| 3 | 6.4 GHz | HIGH LOAD | 64.000% | **1.50x** | 72°C |
| 4 | 8.2 GHz | VOLATILE | 48.000% | **2.00x** | 86°C |
| 5 | 10.5 GHz | CRITICAL | 32.000% | **3.00x** | 102°C |
| 6 | 14.0 GHz | PLASMA SURGE | 16.000% | **6.00x** | 120°C |
| 7 | 20.0 GHz | SUPERCRITICAL | 6.000% | **16.00x** | 138°C |
| 8 | 28.0 GHz | QUANTUM SINGULARITY | 1.200% | **80.00x** | 155°C |
| 9 | 36.0 GHz | OVERCLOCK GOD | 0.384% | **250.00x** | 175°C |

**❄️ Cryo-Coolant:** Once per round, arm cryo to make the **next** push a guaranteed survival, in
exchange for a permanent **15%** reduction of the final pot.

---

## ⚖️ 3. Mathematical Model — Exact 96.0% RTP

Survival is modelled as a **telescoping cumulative** curve. On a push to tier *k*, the contract
draws a uniform roll in `[0, C[k-1])` and survives iff `roll < C[k]`. Because the per-push
probabilities telescope, `P(reach tier k) = C[k] / C[0] = C[k]`. The multiplier is
`M[k] = round(0.96 / C[k])`, so:

$$\mathbb{E}[\text{payout} \mid \text{target } k] = C_k \cdot M_k = 0.96 \times \text{wager}$$

for **every** target tier (tier 1 is 0.966 from the deliberate 1.05x rounding). The paytable in §2
is the exact math the contract enforces — verify it with:

```sh
cd sdk/casino-sdk/examples/meltdown-public
node test/rtp.mjs
```

which proves the identity `C[k] · M[k] == 0.96` for every tier and Monte-Carlo-confirms the
hit-rates.

---

## 🏗️ 4. Technical Architecture (Chain Casino SDK)

Meltdown is built on the official **`@chain/casino-sdk`** as a **multi-action** game (the mines
shape): the session stays open across pushes, each optionally requesting on-chain VRF.

- **`sdk/casino-sdk/simulator/contracts/MeltdownGame.sol`** — implements `ICasinoGameV2`
  (`quoteCaps`, `quoteRiskParams`, `onSessionStart`, `onPlayerAction`, `onRandomness`,
  `quoteForfeitPayout`). Stateless `SessionContext → StepResult` state machine; unbiased randomness
  via rejection sampling.
- **`examples/meltdown-public/src/host.js`** — connects to the host via `connectGameToHost`; a
  faithful in-browser demo host mirrors the contract so the game is playable standalone (`?demo=1`).
- **`examples/meltdown-public/src/main.js`** — snapshot-driven controller: calls
  `openSession` / `submitAction` / `revealOutcome`, renders from the host snapshot.
- **`examples/meltdown-public/src/render/`, `src/audio/`** — 60 FPS Canvas renderer + Web Audio synth.
- **`examples/meltdown-public/public/game.manifest.json`** — v1 manifest (multi-action capabilities).

The frontend contains **no wallet code**; the host signs every transaction and streams state.

---

## 🚀 5. How to Run

**Full local stack (chain + VRF + host simulator + game):**
```sh
cd sdk/casino-sdk
npm install
npm start          # simulator :3300, Meltdown guest :3200
```
Open **http://localhost:3300**. The local node auto-compiles and deploys `MeltdownGame.sol`; the
simulator mounts the Meltdown iframe.

**Standalone playable demo (no chain):**
```sh
cd sdk/casino-sdk/examples/meltdown-public
npm install
npm run dev        # open http://localhost:3200  (plays against the demo host)
```
