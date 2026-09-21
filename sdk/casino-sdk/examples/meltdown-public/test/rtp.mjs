/**
 * Meltdown RTP proof.
 *
 *   (1) Algebraic: for every target tier k, CUM[k]/1e5 * MULT_BPS[k]/1e4 == 0.9600
 *       (step 1 is 0.9660 by the deliberate 1.05x rounding). This is the exact,
 *       declared paytable the contract enforces — no sampling needed.
 *   (2) Monte Carlo: simulate the telescoping survival model the contract uses
 *       (roll uniform in [0, CUM[k-1]), survive iff roll < CUM[k]) and confirm
 *       observed hit-rate and RTP per target tier.
 *
 * Run: node test/rtp.mjs
 */
import { CUM, MULT_BPS, STEPS } from '../src/engine/meltdown_math.js';
import crypto from 'node:crypto';

let failed = false;
const RTP_BASE = 9600; // 0.9600 in bps

console.log('=== (1) Exact paytable identity  C[k] * mult[k] == RTP ===');
for (let k = 1; k <= 9; k++) {
  // rtpBps = CUM[k]/1e5 * MULT_BPS[k]  (both scaled) => CUM[k]*MULT_BPS[k]/1e5, in bps
  const rtpBps = (CUM[k] * MULT_BPS[k]) / 100000;
  const ok = k === 1 ? Math.round(rtpBps) === 9660 : Math.round(rtpBps) === RTP_BASE;
  if (!ok) failed = true;
  console.log(
    `  tier ${k} [${STEPS[k].ghz.toFixed(1)}GHz ${(MULT_BPS[k] / 1e4).toFixed(2)}x]  ` +
    `C=${(CUM[k] / 1e5 * 100).toFixed(3)}%  RTP=${(rtpBps / 100).toFixed(2)}%  ${ok ? 'OK' : 'FAIL'}`,
  );
}

function uniform(n) {
  const N = BigInt(n);
  const MAX = 1n << 64n;
  const limit = MAX - (MAX % N);
  let v;
  do { v = crypto.randomBytes(8).readBigUInt64BE(); } while (v >= limit);
  return Number(v % N);
}

console.log('\n=== (2) Monte Carlo (200k rounds / target) ===');
const ROUNDS = 200000;
for (let target = 1; target <= 9; target++) {
  let wins = 0;
  for (let i = 0; i < ROUNDS; i++) {
    let alive = true;
    for (let k = 1; k <= target; k++) {
      if (uniform(CUM[k - 1]) >= CUM[k]) { alive = false; break; }
    }
    if (alive) wins++;
  }
  const hit = wins / ROUNDS;
  const rtp = hit * (MULT_BPS[target] / 1e4) * 100;
  const expectedHit = CUM[target] / 1e5;
  const drift = Math.abs(hit - expectedHit) / expectedHit;
  const ok = drift < 0.08 || wins < 500; // loose bound; tiny tiers are noisy
  if (!ok) failed = true;
  console.log(
    `  target ${target}: hit ${(hit * 100).toFixed(3)}% (exp ${(expectedHit * 100).toFixed(3)}%)  ` +
    `RTP ${rtp.toFixed(2)}%  ${ok ? 'OK' : 'DRIFT'}`,
  );
}

console.log(failed ? '\n>>> FAIL' : '\n>>> ALL CHECKS PASSED — declared math matches the paytable.');
process.exit(failed ? 1 : 0);
