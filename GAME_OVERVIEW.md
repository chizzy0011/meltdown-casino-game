# Meltdown: Overclock Protocol ⚡ — Game Overview & Documentation

> **Chain Jam Vol. 1 Official Entry**  
> *A Provably Fair Hardware Push-Your-Luck Wagering Game*

---

## 🎯 1. The Goal & Aim

### What is the Goal of Meltdown?
The goal of **Meltdown** is to pioneer a fresh, high-tension **push-your-luck wagering mechanic** designed specifically for the **Chain Jam Vol. 1**.

Rather than relying on passive reel spins or classic table games, **Meltdown** puts the player in command of an unstable quantum mining processor where every decision to push the clock speed higher increases both the payout multiplier and the acoustic/thermal danger of a catastrophic hardware blowout.

### Alignment with Jam Judging Criteria:
1. **🆕 Novelty:** Replaces generic crash curves and classic dice with a discrete, hardware-overclocking risk ladder and Cryo-safeguard tactical mechanics.
2. **😃 Fun & Replayability:** Extreme tension loop — turbine fans accelerate, coil whine escalates in frequency, and CRT heat bloom intensifies with every single gigahertz.
3. **🌀 Simplicity:** Push Clock ➔ Watch telemetry ➔ Harvest or Push again.
4. **🔊 Visual & Sound Polish:** 60 FPS HTML5 Canvas with real-time heat dispersion, circuit nodal pulses, frost vapor, and a 100% native Web Audio synthesizer with zero external audio assets.
5. **⚖️ Exact 96.0% RTP Math:** Continuous 96.0% Return to Player mathematically guaranteed across all step targets.

---

## 🕹️ 2. What This Game Is All About

### The Core Loop
1. **Set Base Wager:** Enter your wager (e.g. 1.00 USDC) and press **⚡ OVERCLOCK (START)**.
2. **Step Overclocking:** Each click on **PUSH CLOCK** pushes the processor to the next frequency tier:
   - **Step 1 (3.2 GHz):** `1.30x` (73.85% Survival | 52°C)
   - **Step 2 (4.8 GHz):** `1.95x` (49.23% Survival | 68°C)
   - **Step 3 (6.4 GHz):** `3.20x` (30.00% Survival | 84°C)
   - **Step 4 (8.2 GHz):** `5.60x` (17.14% Survival | 98°C)
   - **Step 5 (10.5 GHz):** `10.50x` (9.14% Survival | 112°C)
   - **Step 6 (14.0 GHz):** `22.00x` (4.36% Survival | 128°C)
   - **Step 7 (20.0 GHz):** `55.00x` (1.75% Survival | 145°C)
   - **Step 8 (32.0 GHz):** `250.00x` (0.384% Survival | 168°C — **OVERCLOCK GOD**)
3. **Emergency Cryo-Coolant (❄️):**
   - Once per round, the player can click **INJECT CRYO (-15%)**.
   - Liquid nitrogen floods the socket die, creating frost vapor and guaranteeing **100% survival on the next push** in exchange for a 15% reduction to the current pot.
4. **Harvest or Meltdown:**
   - Click **💰 HARVEST POT** at any point to bank your winnings safely.
   - If the core exceeds its VRF-seeded thermal threshold on an unprotected push, it explodes in a **Catastrophic Blowout** and resets the round.

---

## ⚖️ 3. Mathematical Model & RTP (Exact 96.0%)

Every step's payout multiplier is mathematically derived from the exact survival cumulative probability $C_k$:

$$M_k = \frac{0.9600}{C_k}$$

- $\mathbb{E}[\text{Payout}] = C_k \times M_k = 0.9600 \times \text{Wager}$ across every possible target step.

---

## 🏗️ 4. Technical Architecture

- **`contracts/Meltdown.sol`:** Smart contract implementing the official Chain `ICasinoGameV2` specification.
- **`src/engine/meltdown_math.js`:** Discrete probability survival model and step state machine.
- **`src/render/core_renderer.js`:** 60 FPS HTML5 Canvas processor die renderer with dynamic heat coloring and particle explosions.
- **`src/audio/overclock_audio.js`:** Web Audio synthesizer simulating turbine fan pitch sweeps, liquid nitrogen venting, and blowout sub-bass blasts.
- **`src/sdk/bridge.js`:** Penpal bridge adapter for `chain.wtf` iframe embedding and standalone simulator.
- **`game.manifest.json`:** Verified Chain Jam manifest.

---

## 🚀 5. How to Run

```powershell
cd C:\Users\lenovo\Documents\Meltdown
node server.js
```
Open **`http://localhost:8081/`** in your browser.
