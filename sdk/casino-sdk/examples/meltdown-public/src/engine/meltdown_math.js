/**
 * Meltdown - Shared paytable & display data.
 *
 * NOTE: This module is presentation/data only. The authoritative outcome logic
 * lives on-chain in `MeltdownGame.sol` (and is mirrored by the standalone demo
 * host). The frontend never decides survival — it renders what the host settles.
 *
 * Exact 96.0% RTP: CUM[k]/1e5 is the cumulative probability of reaching tier k,
 * and multiplier[k] = round(0.96 / (CUM[k]/1e5)); so E[payout | target k] =
 * (CUM[k]/1e5) * mult[k] = 0.96 * wager for every target (step 1 = 0.966 from
 * the integer rounding of 1.05x). Matches the contract paytable exactly.
 */

export const STEPS = [
  { step: 0, ghz: 2.0,  multiplier: 1.00,   temp: 35,  rpm: 2000,  label: 'IDLE',                survivalRate: '100%' },
  { step: 1, ghz: 3.2,  multiplier: 1.05,   temp: 45,  rpm: 3200,  label: 'STABLE',              survivalRate: '92%' },
  { step: 2, ghz: 4.8,  multiplier: 1.20,   temp: 58,  rpm: 4800,  label: 'TURBO',               survivalRate: '80%' },
  { step: 3, ghz: 6.4,  multiplier: 1.50,   temp: 72,  rpm: 6500,  label: 'HIGH LOAD',           survivalRate: '64%' },
  { step: 4, ghz: 8.2,  multiplier: 2.00,   temp: 86,  rpm: 8800,  label: 'VOLATILE',            survivalRate: '48%' },
  { step: 5, ghz: 10.5, multiplier: 3.00,   temp: 102, rpm: 11500, label: 'CRITICAL',            survivalRate: '32%' },
  { step: 6, ghz: 14.0, multiplier: 6.00,   temp: 120, rpm: 14500, label: 'PLASMA SURGE',        survivalRate: '16%' },
  { step: 7, ghz: 20.0, multiplier: 16.00,  temp: 138, rpm: 18000, label: 'SUPERCRITICAL',       survivalRate: '6%' },
  { step: 8, ghz: 28.0, multiplier: 80.00,  temp: 155, rpm: 21500, label: 'QUANTUM SINGULARITY', survivalRate: '1.2%' },
  { step: 9, ghz: 36.0, multiplier: 250.00, temp: 175, rpm: 25000, label: 'OVERCLOCK GOD',       survivalRate: '0.38%' }
];

/** Cumulative survival to each tier, scaled by 1e5 (mirrors MeltdownGame.sol `_cum`). */
export const CUM = [100000, 92000, 80000, 64000, 48000, 32000, 16000, 6000, 1200, 384];

/** Payout multiplier in basis points (mirrors MeltdownGame.sol `_multBps`). */
export const MULT_BPS = [10000, 10500, 12000, 15000, 20000, 30000, 60000, 160000, 800000, 2500000];

export const MAX_STEP = 9;
export const CRYO_KEEP_BPS = 8500;

export const MINER_RANKS = [
  { xp: 0,   title: 'NOVICE MINER',     badge: '🥉' },
  { xp: 30,  title: 'SILICON JOCKEY',   badge: '🥈' },
  { xp: 100, title: 'CRYO SPECIALIST',  badge: '❄️' },
  { xp: 250, title: 'OVERCLOCK MASTER', badge: '🥇' },
  { xp: 600, title: 'QUANTUM DEITY',    badge: '👑' }
];

/**
 * Cash-out value for a given wager (base units). Mirrors MeltdownGame.sol `_cashout`
 * exactly: a blown core or the idle tier pays nothing; the cryo penalty applies otherwise.
 */
export function cashout(wagerBaseUnits, step, cryoUsed, blown = false) {
  if (blown || step <= 0) return 0n;
  let payout = (wagerBaseUnits * BigInt(MULT_BPS[step])) / 10000n;
  if (cryoUsed) payout = (payout * BigInt(CRYO_KEEP_BPS)) / 10000n;
  return payout;
}
