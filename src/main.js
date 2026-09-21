/**
 * Meltdown - Main Controller (Clean & Balanced)
 * Smooth step progression, in-game toast notifications, and ambient hardware audio.
 */

import { MeltdownEngine, STEPS, MINER_RANKS } from './engine/meltdown_math.js';
import { CoreRenderer } from './render/core_renderer.js';
import { overclockAudio } from './audio/overclock_audio.js';
import { meltdownBridge } from './sdk/bridge.js';

class MeltdownApp {
  constructor() {
    this.canvas = document.getElementById('coreCanvas');
    this.renderer = new CoreRenderer(this.canvas);
    this.engine = null;
    this.wager = 1.0;
    this.inRound = false;
    this.winStreak = 0;
    this.xp = 0;
    this.toastTimer = null;

    this.initUI();
    this.initBridge();
    this.renderLadder();
    this.startLoop();
  }

  async initBridge() {
    await meltdownBridge.init();
    meltdownBridge.subscribeState((state) => {
      document.getElementById('balanceVal').textContent = `${parseFloat(state.balance).toFixed(2)} ${state.currency}`;
    });
  }

  renderLadder() {
    const ladder = document.getElementById('multiplierLadder');
    ladder.innerHTML = '';

    for (let i = STEPS.length - 1; i >= 1; i--) {
      const s = STEPS[i];
      const div = document.createElement('div');
      div.className = `step-card ${i === 9 ? 'god' : ''}`;
      div.id = `step-card-${i}`;
      div.innerHTML = `
        <span><strong>${s.ghz.toFixed(1)} GHz</strong> <small style="color:var(--text-dim)">(${s.label})</small></span>
        <span class="step-mult">${s.multiplier.toFixed(2)}x</span>
      `;
      ladder.appendChild(div);
    }
  }

  initUI() {
    const wagerInput = document.getElementById('wagerInput');
    wagerInput.addEventListener('input', (e) => {
      this.wager = Math.max(0.1, parseFloat(e.target.value) || 0.1);
    });

    // Push / Start Button
    const pushBtn = document.getElementById('pushBtn');
    pushBtn.addEventListener('click', () => this.handlePushClock());

    // Cryo Coolant Button
    const cryoBtn = document.getElementById('cryoBtn');
    cryoBtn.addEventListener('click', () => this.handleInjectCryo());

    // Harvest / Cash Out Button
    const harvestBtn = document.getElementById('harvestBtn');
    harvestBtn.addEventListener('click', () => this.handleHarvest());

    // Auto-Target Buttons
    document.querySelectorAll('.target-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        if (this.inRound) return;
        const target = parseInt(e.currentTarget.dataset.target, 10);
        await this.runAutoTarget(target);
      });
    });

    // Mute Button
    const muteBtn = document.getElementById('muteBtn');
    muteBtn.addEventListener('click', () => {
      const isMuted = overclockAudio.toggleMute();
      muteBtn.textContent = isMuted ? '🔇' : '🔊';
    });
  }

  showToast(title, desc, isMeltdown = false) {
    const toast = document.getElementById('toastBanner');
    const toastTitle = document.getElementById('toastTitle');
    const toastDesc = document.getElementById('toastDesc');

    if (this.toastTimer) clearTimeout(this.toastTimer);

    toastTitle.textContent = title;
    toastDesc.textContent = desc;

    if (isMeltdown) {
      toast.classList.add('meltdown');
      toastTitle.style.color = '#ff1133';
    } else {
      toast.classList.remove('meltdown');
      toastTitle.style.color = '#00ff66';
    }

    toast.classList.add('show');
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 3200);
  }

  async runAutoTarget(targetStep) {
    await this.handlePushClock();
    while (this.inRound && this.engine && this.engine.currentStep < targetStep) {
      await new Promise(r => setTimeout(r, 450));
      if (!this.inRound) break;
      await this.handlePushClock();
    }
    if (this.inRound && this.engine && this.engine.currentStep >= targetStep) {
      await new Promise(r => setTimeout(r, 250));
      await this.handleHarvest();
    }
  }

  async handlePushClock() {
    if (!this.inRound) {
      try {
        const session = await meltdownBridge.openSession(this.wager);
        this.engine = new MeltdownEngine(session.vrfSeed);
        this.inRound = true;

        overclockAudio.startAmbientDrone();
        document.getElementById('vrfSeedDisplay').textContent = session.vrfSeed;
        document.getElementById('wagerInput').disabled = true;
        document.getElementById('harvestBtn').disabled = false;
        document.getElementById('cryoBtn').disabled = false;
        document.getElementById('pushBtn').textContent = '⚡ PUSH CLOCK';
      } catch (err) {
        this.showToast('⚠️ ERROR', err.message || 'Failed to start session', true);
        return;
      }
    }

    overclockAudio.playPushSurge(this.engine.currentStep + 1);
    const result = this.engine.pushClock();

    if (result.status === 'SUCCESS') {
      this.updateTelemetry(result.data);
      this.renderer.setStepData(result.data);
      this.highlightLadder(result.step);
      overclockAudio.updateDroneRPM(result.data.rpm, result.data.temp);

      if (result.isMax) {
        await this.handleHarvest();
      }
    } else if (result.status === 'MELTDOWN') {
      await this.handleMeltdown(result);
    }
  }

  handleInjectCryo() {
    if (!this.inRound || !this.engine) return;
    const res = this.engine.injectCryo();
    if (res.success) {
      overclockAudio.playCryoHiss();
      this.renderer.triggerCryoVapor();
      document.getElementById('cryoBtn').disabled = true;
      document.getElementById('cryoBtn').textContent = '❄️ CRYO ARMED';
      this.showToast('❄️ CRYO-COOLANT ARMED', 'Next push guaranteed 100% safe (-15% pot penalty)');
    }
  }

  async handleHarvest() {
    if (!this.inRound || !this.engine) return;
    const mult = this.engine.getCurrentMultiplier();
    const payout = (this.wager * mult).toFixed(2);
    this.inRound = false;

    this.winStreak++;
    this.xp += Math.round(mult * 10);
    this.updateMinerRank();

    overclockAudio.playHarvestWin(mult);
    await meltdownBridge.revealOutcome(mult);

    this.showToast('🎉 HARVEST SUCCESSFUL!', `+${mult.toFixed(2)}x (+$${payout} USDC)`);
    this.resetRoundUI();
  }

  async handleMeltdown(res) {
    this.inRound = false;
    this.winStreak = 0;
    this.updateMinerRank();

    overclockAudio.playMeltdownBlowout();
    this.renderer.triggerMeltdown();
    await meltdownBridge.revealOutcome(0);

    document.getElementById('statusVal').textContent = '💥 BLOWOUT';
    document.getElementById('statusVal').style.color = '#ff1133';

    this.showToast('💥 CORE MELTDOWN!', `Overclock exceeded limit at ${res.targetGhz} GHz`, true);
    this.resetRoundUI(true);
  }

  updateMinerRank() {
    let currentRank = MINER_RANKS[0];
    for (const r of MINER_RANKS) {
      if (this.xp >= r.xp) currentRank = r;
    }
    document.getElementById('minerRank').textContent = `${currentRank.badge} ${currentRank.title}`;
    const streakTag = document.getElementById('streakTag');
    if (streakTag) {
      streakTag.textContent = this.winStreak > 1 ? `🔥 ${this.winStreak} STREAK` : '';
    }
  }

  updateTelemetry(data) {
    document.getElementById('ghzVal').textContent = `${data.ghz.toFixed(1)} GHz`;
    document.getElementById('tempVal').textContent = `${data.temp}°C`;
    document.getElementById('rpmVal').textContent = `${data.rpm.toLocaleString()} RPM`;
    document.getElementById('multVal').textContent = `${this.engine.getCurrentMultiplier()}x`;
    document.getElementById('statusVal').textContent = data.label;
    document.getElementById('statusVal').style.color = '#00ff66';
  }

  highlightLadder(step) {
    document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active'));
    const active = document.getElementById(`step-card-${step}`);
    if (active) active.classList.add('active');
  }

  resetRoundUI(meltdown = false) {
    overclockAudio.stopAmbientDrone();
    document.getElementById('wagerInput').disabled = false;
    document.getElementById('harvestBtn').disabled = true;
    document.getElementById('cryoBtn').disabled = true;
    document.getElementById('cryoBtn').textContent = '❄️ INJECT CRYO (-15%)';
    document.getElementById('pushBtn').textContent = '⚡ OVERCLOCK (START)';

    if (!meltdown) {
      this.renderer.reset();
      document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active'));
      document.getElementById('ghzVal').textContent = '2.0 GHz';
      document.getElementById('tempVal').textContent = '35°C';
      document.getElementById('rpmVal').textContent = '2,000 RPM';
      document.getElementById('multVal').textContent = '1.00x';
      document.getElementById('statusVal').textContent = 'IDLE';
      document.getElementById('statusVal').style.color = '#00f0ff';
    }
  }

  startLoop() {
    const loop = () => {
      this.renderer.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MeltdownApp();
});
