/**
 * Meltdown - Host bridge.
 *
 * Exposes ONE uniform interface (`HostApiV1` + snapshot stream) regardless of
 * environment:
 *   - Embedded in the Chain.wtf casino host  -> real `connectGameToHost` bridge;
 *     the host signs txs, runs MeltdownGame.sol on-chain, and streams snapshots.
 *   - Opened standalone (raw file / `?demo=1`) -> a local demo host that mirrors
 *     the contract's state machine and emits HostSnapshotV1-shaped snapshots, so
 *     the game is fully playable outside the iframe (jam eligibility requirement).
 *
 * The controller (`main.js`) is identical in both modes: call openSession /
 * submitAction / revealOutcome, render from the snapshot.
 */

import { connectGameToHost } from '@chain/casino-sdk/guest';
import { encodeAbiParameters, decodeAbiParameters } from 'viem';
import { CUM, cashout, MAX_STEP } from './engine/meltdown_math.js';

const STATE_TUPLE = [{
  type: 'tuple',
  components: [
    { name: 'step', type: 'uint8' },
    { name: 'cryoUsed', type: 'bool' },
    { name: 'cryoArmed', type: 'bool' },
    { name: 'blown', type: 'bool' },
  ],
}];

export const ACTION = { PUSH: 0, CRYO: 1, HARVEST: 2 };
export const DECIMALS = 6;

/** Encode an action selector for `submitAction({ actionData })`. */
export function encodeAction(action) {
  return encodeAbiParameters([{ type: 'uint8' }], [action]);
}

/** Decode a MeltdownState struct from a session's `raw.gameState` hex. */
export function decodeState(hex) {
  if (!hex || hex === '0x') return { step: 0, cryoUsed: false, cryoArmed: false, blown: false };
  try {
    const [s] = decodeAbiParameters(STATE_TUPLE, hex);
    return { step: Number(s.step), cryoUsed: s.cryoUsed, cryoArmed: s.cryoArmed, blown: s.blown };
  } catch {
    return { step: 0, cryoUsed: false, cryoArmed: false, blown: false };
  }
}

function encodeState(s) {
  return encodeAbiParameters(STATE_TUPLE, [{
    step: s.step, cryoUsed: s.cryoUsed, cryoArmed: s.cryoArmed, blown: s.blown,
  }]);
}

const HANDSHAKE_TIMEOUT_MS = 3500;

/**
 * Connect to a host. Resolves `{ mode, hostApi }` and pushes snapshots to
 * `onSnapshot`. Falls back to the demo host when not embedded, when `?demo=1`,
 * or when the real handshake does not resolve in time.
 */
export function createHost(onSnapshot) {
  const params = new URLSearchParams(location.search);
  const forceDemo = params.get('demo') === '1';
  const embedded = window.parent !== window;

  if (forceDemo || !embedded) {
    const demo = createDemoHost(onSnapshot);
    return Promise.resolve({ mode: 'demo', hostApi: demo });
  }

  const connection = connectGameToHost({
    async setState(snapshot) { onSnapshot(snapshot); },
  });

  const real = connection.promise.then(hostApi => ({ mode: 'real', hostApi }));
  const timeout = new Promise(resolve =>
    setTimeout(() => resolve({ mode: 'demo', hostApi: createDemoHost(onSnapshot) }), HANDSHAKE_TIMEOUT_MS),
  );
  return Promise.race([real, timeout]).catch(() => ({
    mode: 'demo', hostApi: createDemoHost(onSnapshot),
  }));
}

// ---------------------------------------------------------------------------
// Demo host — a faithful in-browser mirror of MeltdownGame.sol.
// ---------------------------------------------------------------------------

function createDemoHost(onSnapshot) {
  const state = {
    balance: 1000n * 10n ** BigInt(DECIMALS), // 1000 chUSD
    session: null, // { sessionId, wager, phase, mstate, payout, randomness, isSettled }
  };

  const toUnits = (human) => BigInt(Math.round(parseFloat(human) * 10 ** DECIMALS));

  function snapshot() {
    const items = state.session ? [{
      sessionId: state.session.sessionId,
      sessionKey: state.session.sessionId,
      gameAddress: '0x000000000000000000000000000000000000dEm0',
      phase: state.session.phase,
      phaseName: phaseName(state.session.phase),
      wager: state.session.wager.toString(),
      stake: state.session.wager.toString(),
      payout: (state.session.payout ?? 0n).toString(),
      isSettled: state.session.isSettled,
      lastEventTimestamp: Date.now(),
      raw: {
        gameData: '0x',
        gameState: encodeState(state.session.mstate),
        randomness: state.session.randomness,
      },
    }] : [];

    return {
      apiVersion: 1,
      integration: {
        chainId: 0,
        slug: 'meltdown-demo',
        gameAddress: '0x000000000000000000000000000000000000dEm0',
        manifest: { schemaVersion: 1, gameId: 'MeltdownGame', apiVersion: 1, defaultLocale: 'en', locales: { en: { name: 'Meltdown' } } },
      },
      wallet: { address: '0x000000000000000000000000000000000000bEEf', status: 'ready' },
      token: { symbol: 'chUSD', decimals: DECIMALS },
      balances: { smartVaultBalance: state.balance.toString() },
      sessions: { items },
      ui: { locale: 'en', theme: 'dark' },
    };
  }

  const emit = () => onSnapshot(snapshot());
  emit();

  function randomHex() {
    const b = new Uint8Array(32);
    crypto.getRandomValues(b);
    return '0x' + Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
  }

  // Unbiased uniform in [0, n) — mirrors the contract's rejection sampling.
  function uniform(n) {
    const buf = new Uint32Array(2);
    const N = BigInt(n);
    const MAX = 1n << 64n;
    const limit = MAX - (MAX % N);
    let v;
    do {
      crypto.getRandomValues(buf);
      v = (BigInt(buf[0]) << 32n) | BigInt(buf[1]);
    } while (v >= limit);
    return Number(v % N);
  }

  function settle(sess) {
    sess.payout = cashout(sess.wager, sess.mstate.step, sess.mstate.cryoUsed);
    sess.phase = 3; // SETTLED
    sess.isSettled = true;
    state.balance += sess.payout;
  }

  return {
    async openSession({ wager }) {
      const w = toUnits(wager);
      if (w > state.balance) throw new Error('Insufficient balance');
      state.balance -= w;
      state.session = {
        sessionId: 'demo_' + Date.now(),
        wager: w,
        phase: 2, // WAITING_PLAYER_ACTION
        mstate: { step: 0, cryoUsed: false, cryoArmed: false, blown: false },
        payout: 0n,
        randomness: undefined,
        isSettled: false,
      };
      emit();
      return { sessionKey: state.session.sessionId, transactionHash: randomHex() };
    },

    async submitAction({ actionData }) {
      const sess = state.session;
      if (!sess || sess.isSettled) throw new Error('No active session');
      const [action] = decodeAbiParameters([{ type: 'uint8' }], actionData);
      const a = Number(action);
      const s = sess.mstate;

      if (a === ACTION.HARVEST) {
        if (s.step === 0) throw new Error('Nothing to harvest');
        settle(sess);
        emit();
      } else if (a === ACTION.CRYO) {
        if (s.step === 0 || s.cryoUsed || s.cryoArmed) throw new Error('Cryo unavailable');
        s.cryoUsed = true; s.cryoArmed = true;
        emit();
      } else if (a === ACTION.PUSH) {
        if (s.step >= MAX_STEP) throw new Error('Round over');
        if (s.cryoArmed) {
          s.cryoArmed = false; s.step += 1;
          if (s.step === MAX_STEP) settle(sess);
          emit();
        } else {
          // Request randomness: enter WAITING_RANDOMNESS, then fulfil after a beat.
          sess.phase = 1; // WAITING_RANDOMNESS
          emit();
          await new Promise(r => setTimeout(r, 520));
          const denom = CUM[s.step];
          const threshold = CUM[s.step + 1];
          sess.randomness = randomHex();
          const roll = uniform(denom);
          if (roll < threshold) {
            s.step += 1;
            if (s.step === MAX_STEP) settle(sess);
            else sess.phase = 2; // back to WAITING_PLAYER_ACTION
          } else {
            s.blown = true;
            settle(sess); // payout 0 (blown)
          }
          emit();
        }
      } else {
        throw new Error('Invalid action');
      }
      return { transactionHash: randomHex() };
    },

    async revealOutcome() { /* demo settles synchronously; nothing to reveal */ },
    async cancelStuckRandomness() { return { transactionHash: randomHex() }; },
  };
}

function phaseName(phase) {
  return ['NONE', 'WAITING_RANDOMNESS', 'WAITING_PLAYER_ACTION', 'SETTLED', 'FORFEITED', 'CANCELLED'][phase];
}
