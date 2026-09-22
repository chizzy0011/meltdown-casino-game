/**
 * Meltdown behaviour invariants (regression guards).
 *
 * The load-bearing one: a BLOWN core pays ZERO. This mirrors MeltdownGame.sol
 * `_cashout` (blown || step==0 => 0) and guards the demo-host settle path, where
 * a bug once paid out the last-survived tier's multiplier on a meltdown.
 *
 * Run: node test/behavior.mjs
 */
import { cashout, MULT_BPS, CRYO_KEEP_BPS, MAX_STEP } from '../src/engine/meltdown_math.js';

const W = 1_000_000n; // 1.0 token @ 6 decimals
let failed = 0;
const check = (label, got, exp) => {
  const ok = got === exp;
  if (!ok) failed++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} = ${got}${ok ? '' : `  EXPECTED ${exp}`}`);
};

console.log('=== A blown core pays ZERO at every tier (with/without cryo) ===');
for (let step = 1; step <= MAX_STEP; step++) {
  check(`tier ${step} blown`,        cashout(W, step, false, true), 0n);
  check(`tier ${step} blown + cryo`, cashout(W, step, true,  true), 0n);
}

console.log('\n=== Idle tier pays ZERO ===');
check('step 0', cashout(W, 0, false, false), 0n);
check('step 0 blown', cashout(W, 0, false, true), 0n);

console.log('\n=== Surviving pays the exact tier multiplier ===');
for (let step = 1; step <= MAX_STEP; step++) {
  check(`tier ${step} banked`, cashout(W, step, false, false), (W * BigInt(MULT_BPS[step])) / 10000n);
}

console.log('\n=== Cryo keeps 85% of the pot ===');
for (const step of [2, 5, 9]) {
  const base = (W * BigInt(MULT_BPS[step])) / 10000n;
  check(`tier ${step} cryo`, cashout(W, step, true, false), (base * BigInt(CRYO_KEEP_BPS)) / 10000n);
}

console.log('\n=== Settle simulation: a round that busts nets exactly -wager ===');
// Mirrors the demo host / facet: escrow the wager on open, credit `cashout` on settle.
function simulateRound({ reachedTier, blown, cryoUsed }) {
  let balance = 0n;
  balance -= W;                                   // escrow wager at openSession
  const payout = cashout(W, reachedTier, cryoUsed, blown);
  balance += payout;                              // credit at settle
  return { payout, net: balance };
}
{
  const bust = simulateRound({ reachedTier: 4, blown: true, cryoUsed: false });
  check('bust payout', bust.payout, 0n);
  check('bust net', bust.net, -W);                // lost exactly the wager, no winnings
  const win = simulateRound({ reachedTier: 3, blown: false, cryoUsed: false });
  check('harvest tier3 payout', win.payout, 1_500_000n);
  check('harvest tier3 net', win.net, 500_000n);  // +0.5 on a 1.5x bank of 1.0
}

console.log(failed ? `\n>>> FAIL (${failed})` : '\n>>> ALL BEHAVIOUR INVARIANTS HOLD');
process.exit(failed ? 1 : 0);
