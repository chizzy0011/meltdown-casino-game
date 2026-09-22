/**
 * Meltdown - Main Controller (snapshot-driven).
 *
 * The controller is a pure view over the host's session snapshot. It NEVER
 * decides survival: it calls openSession / submitAction / revealOutcome and
 * animates whatever the host (on-chain contract, or the standalone demo host)
 * settles. Identical code path embedded and standalone.
 */

import './styles.css';
import { STEPS, MINER_RANKS } from './engine/meltdown_math.js';
import { CoreRenderer } from './render/core_renderer.js';
import { overclockAudio } from './audio/overclock_audio.js';
import { createHost, encodeAction, decodeState, ACTION, DECIMALS } from './host.js';

const $ = (id) => document.getElementById(id);

function fmtUnits(str, decimals = DECIMALS) {
  try {
    const v = BigInt(str || '0');
    const base = 10n ** BigInt(decimals);
    const whole = v / base;
    const frac = (v % base).toString().padStart(decimals, '0').slice(0, 2);
    return `${whole.toString()}.${frac}`;
  } catch { return '0.00'; }
}

class MeltdownApp {
  constructor() {
    this.canvas = $('coreCanvas');
    this.renderer = new CoreRenderer(this.canvas);
    this.hostApi = null;
    this.mode = 'demo';
    this.symbol = 'USDC';
    this.decimals = DECIMALS;

    this.autoTarget = null;   // step index for auto-play, or null
    this.busy = false;        // guards against duplicate submits between snapshots
    this.winStreak = 0;
    this.xp = 0;
    this.toastTimer = null;

    // Last observed session view, to detect transitions.
    this.prev = { sessionId: null, step: 0, phase: 0, settled: false, blown: false, cryoArmed: false };

    this.renderLadder();
    this.initUI();
    this.startLoop();
    this.connect();
  }

  async connect() {
    this.hostApi = null;
    let conn;
    try {
      conn = await createHost((snap) => this.onSnapshot(snap));
    } catch {
      // Embedded but the host handshake never resolved (e.g. opened in an iframe
      // that isn't a casino host). Leave the "connecting" overlay up, like coinflip.
      $('connectSub').textContent = 'Waiting for a casino host… (open inside chain.wtf or the simulator)';
      return;
    }
    this.mode = conn.mode;
    this.hostApi = conn.hostApi;
    if (this.mode === 'demo') {
      $('connectSub').textContent = 'Running in standalone demo mode (play-money).';
    }
    $('connectOverlay').classList.add('hidden');
  }

  // ---- rendering from snapshot -------------------------------------------

  onSnapshot(snap) {
    if (!snap) return;
    this.symbol = snap.token?.symbol || 'USDC';
    this.decimals = snap.token?.decimals ?? DECIMALS;
    $('balanceVal').textContent = `${fmtUnits(snap.balances?.smartVaultBalance, this.decimals)} ${this.symbol}`;

    const items = snap.sessions?.items || [];
    const sess = items.length ? items[items.length - 1] : null;

    if (!sess) { this.applyIdle(); return; }

    const st = decodeState(sess.raw?.gameState);
    const phase = sess.phase ?? 0;
    const settled = !!sess.isSettled || phase === 3;
    const wager = BigInt(sess.wager || '0');
    this.activeSessionId = sess.sessionId;

    // Transition detection ------------------------------------------------
    const isNewSession = sess.sessionId !== this.prev.sessionId;
    if (isNewSession) {
      this.prev = { sessionId: sess.sessionId, step: 0, phase, settled: false, blown: false, cryoArmed: false };
      overclockAudio.startAmbientDrone();
    }

    if (st.cryoArmed && !this.prev.cryoArmed) {
      overclockAudio.playCryoHiss?.();
      this.renderer.triggerCryoVapor?.();
      this.showToast('❄️ CRYO-COOLANT ARMED', 'Next push guaranteed 100% safe (-15% pot penalty).');
    }

    if (st.step > this.prev.step && !st.blown) {
      // Advanced a tier.
      const data = STEPS[st.step];
      overclockAudio.playPushSurge(st.step);
      this.renderer.setStepData(data);
      this.highlightLadder(st.step);
      overclockAudio.updateDroneRPM(data.rpm, data.temp);
      this.updateTelemetry(data, st);
    }

    if (settled && !this.prev.settled) {
      this.onSettled(sess, st, wager);
    }

    // Live telemetry / vrf display for in-progress rounds.
    if (!settled) {
      if (sess.raw?.randomness) $('vrfSeedDisplay').textContent = sess.raw.randomness.slice(0, 18) + '…';
      if (st.step >= 1) this.updateTelemetry(STEPS[st.step], st);
    }

    this.applyControls(phase, st, settled);
    this.prev = { sessionId: sess.sessionId, step: st.step, phase, settled, blown: st.blown, cryoArmed: st.cryoArmed };

    // Auto-play driver: act only on a stable player-action phase.
    if (this.autoTarget != null && phase === 2 && !settled && !this.busy) {
      if (st.step >= this.autoTarget) { this.autoTarget = null; this.doAction(ACTION.HARVEST); }
      else this.doAction(ACTION.PUSH);
    }
  }

  onSettled(sess, st, wager) {
    overclockAudio.stopAmbientDrone();
    const payout = BigInt(sess.payout || '0');
    if (st.blown || payout === 0n) {
      this.winStreak = 0;
      overclockAudio.playMeltdownBlowout();
      this.renderer.triggerMeltdown();
      $('statusVal').textContent = '💥 BLOWOUT';
      $('statusVal').style.color = '#ff1133';
      this.showToast('💥 CORE MELTDOWN!', 'The quantum core overclocked past its thermal limit.', true);
    } else {
      const mult = this.multiplier(st);
      this.winStreak++;
      this.xp += Math.round(mult * 10);
      overclockAudio.playHarvestWin(mult);
      this.showToast('🎉 HARVEST SUCCESSFUL!', `+${mult.toFixed(2)}x  (+${fmtUnits(payout.toString(), this.decimals)} ${this.symbol})`);
      if (this.mode === 'real' && this.hostApi?.revealOutcome) {
        this.hostApi.revealOutcome({ sessionId: sess.sessionId }).catch(() => {});
      }
    }
    this.updateMinerRank();
    this.autoTarget = null;
    setTimeout(() => this.renderer.reset(), 400);
  }

  multiplier(st) {
    let m = STEPS[st.step].multiplier;
    if (st.cryoUsed) m *= 0.85;
    return Number(m.toFixed(2));
  }

  // ---- actions ------------------------------------------------------------

  async doAction(action) {
    if (!this.hostApi || this.busy) return;
    this.busy = true;
    try {
      await this.hostApi.submitAction({ sessionId: this.activeSessionId, actionData: encodeAction(action) });
    } catch (e) {
      this.showToast('⚠️ ACTION FAILED', e?.message || 'Rejected', true);
    } finally {
      this.busy = false;
    }
  }

  async handlePush() {
    if (!this.hostApi || this.busy) return;
    const inRound = this.prev.sessionId && !this.prev.settled &&
      this.activeSessionId === this.prev.sessionId && !this.prev.blown && this.prev.step < 9;
    if (inRound && this.currentPhase === 2) { this.doAction(ACTION.PUSH); return; }

    // Start a fresh round: open session, then first push.
    this.busy = true;
    try {
      const wager = Math.max(0.1, parseFloat($('wagerInput').value) || 1).toString();
      const res = await this.hostApi.openSession({ wager, gameData: '0x' });
      this.activeSessionId = res.sessionKey;
      overclockAudio.startAmbientDrone();
    } catch (e) {
      this.showToast('⚠️ ERROR', e?.message || 'Failed to start session', true);
      this.busy = false;
      return;
    }
    this.busy = false;
    // First push (unless auto-target < 1, which never happens).
    this.doAction(ACTION.PUSH);
  }

  async runAutoTarget(target) {
    if (this.busy || (this.prev.sessionId && !this.prev.settled)) return;
    this.autoTarget = target;
    await this.handlePush();
  }

  // ---- UI ----------------------------------------------------------------

  applyControls(phase, st, settled) {
    this.currentPhase = phase;
    const resolving = phase === 1; // WAITING_RANDOMNESS
    const inPlay = phase === 2 && !settled;
    $('wagerInput').disabled = inPlay || resolving;
    $('pushBtn').disabled = resolving || (st.step >= 9);
    $('pushBtn').textContent = inPlay ? '⚡ PUSH CLOCK' : (resolving ? '… OVERCLOCKING' : '⚡ OVERCLOCK (START)');
    $('harvestBtn').disabled = !inPlay || st.step < 1;
    $('cryoBtn').disabled = !inPlay || st.step < 1 || st.cryoUsed || st.cryoArmed;
    $('cryoBtn').textContent = st.cryoArmed ? '❄️ CRYO ARMED' : '❄️ INJECT CRYO (-15%)';
    if (resolving) { $('statusVal').textContent = 'AWAITING VRF…'; $('statusVal').style.color = 'var(--accent-amber)'; }
  }

  applyIdle() {
    this.currentPhase = 0;
    $('wagerInput').disabled = false;
    $('pushBtn').disabled = false;
    $('pushBtn').textContent = '⚡ OVERCLOCK (START)';
    $('harvestBtn').disabled = true;
    $('cryoBtn').disabled = true;
    $('cryoBtn').textContent = '❄️ INJECT CRYO (-15%)';
    $('statusVal').textContent = 'IDLE';
    $('statusVal').style.color = 'var(--accent-cyan)';
  }

  renderLadder() {
    const ladder = $('multiplierLadder');
    ladder.innerHTML = '';
    for (let i = STEPS.length - 1; i >= 1; i--) {
      const s = STEPS[i];
      const div = document.createElement('div');
      div.className = `step-card ${i === 9 ? 'god' : ''}`;
      div.id = `step-card-${i}`;
      div.innerHTML = `
        <span><strong>${s.ghz.toFixed(1)} GHz</strong> <small style="color:var(--text-dim)">(${s.label})</small></span>
        <span class="step-mult">${s.multiplier.toFixed(2)}x</span>`;
      ladder.appendChild(div);
    }
  }

  initUI() {
    $('pushBtn').addEventListener('click', () => this.handlePush());
    $('cryoBtn').addEventListener('click', () => this.doAction(ACTION.CRYO));
    $('harvestBtn').addEventListener('click', () => this.doAction(ACTION.HARVEST));
    document.querySelectorAll('.target-btn').forEach(btn => {
      btn.addEventListener('click', (e) => this.runAutoTarget(parseInt(e.currentTarget.dataset.target, 10)));
    });
    $('muteBtn').addEventListener('click', () => {
      const muted = overclockAudio.toggleMute();
      $('muteBtn').textContent = muted ? '🔇' : '🔊';
    });
  }

  updateTelemetry(data, st) {
    $('ghzVal').textContent = `${data.ghz.toFixed(1)} GHz`;
    $('tempVal').textContent = `${data.temp}°C`;
    $('rpmVal').textContent = `${data.rpm.toLocaleString()} RPM`;
    $('multVal').textContent = `${this.multiplier(st).toFixed(2)}x`;
    $('statusVal').textContent = data.label;
    $('statusVal').style.color = '#00ff66';
  }

  highlightLadder(step) {
    document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active'));
    const active = $(`step-card-${step}`);
    if (active) active.classList.add('active');
  }

  updateMinerRank() {
    let rank = MINER_RANKS[0];
    for (const r of MINER_RANKS) if (this.xp >= r.xp) rank = r;
    $('minerRank').textContent = `${rank.badge} ${rank.title}`;
    const streak = $('streakTag');
    if (streak) streak.textContent = this.winStreak > 1 ? `🔥 ${this.winStreak} STREAK` : '';
  }

  showToast(title, desc, isMeltdown = false) {
    const toast = $('toastBanner');
    if (this.toastTimer) clearTimeout(this.toastTimer);
    $('toastTitle').textContent = title;
    $('toastDesc').textContent = desc;
    toast.classList.toggle('meltdown', isMeltdown);
    $('toastTitle').style.color = isMeltdown ? '#ff1133' : '#00ff66';
    toast.classList.add('show');
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  startLoop() {
    const loop = () => { this.renderer.render(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
}

window.addEventListener('DOMContentLoaded', () => new MeltdownApp());
