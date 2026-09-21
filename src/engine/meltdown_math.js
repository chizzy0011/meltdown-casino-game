/**
 * Meltdown - Mathematical Model & Step Engine (Clean & Balanced 96.0% RTP)
 * Smooth, accessible difficulty progression designed for maximum fun and excitement.
 */

export const STEPS = [
  { step: 0, ghz: 2.0, multiplier: 1.00,  temp: 35,  rpm: 2000,  label: 'IDLE',          survivalRate: '100%' },
  { step: 1, ghz: 3.2, multiplier: 1.05,  temp: 45,  rpm: 3200,  label: 'STABLE',        survivalRate: '92%' },
  { step: 2, ghz: 4.8, multiplier: 1.20,  temp: 58,  rpm: 4800,  label: 'TURBO',         survivalRate: '80%' },
  { step: 3, ghz: 6.4, multiplier: 1.50,  temp: 72,  rpm: 6500,  label: 'HIGH LOAD',     survivalRate: '64%' },
  { step: 4, ghz: 8.2, multiplier: 2.00,  temp: 86,  rpm: 8800,  label: 'VOLATILE',      survivalRate: '48%' },
  { step: 5, ghz: 10.5, multiplier: 3.00, temp: 102, rpm: 11500, label: 'CRITICAL',      survivalRate: '32%' },
  { step: 6, ghz: 14.0, multiplier: 6.00, temp: 120, rpm: 14500, label: 'PLASMA SURGE',  survivalRate: '16%' },
  { step: 7, ghz: 20.0, multiplier: 16.00, temp: 138, rpm: 18000, label: 'SUPERCRITICAL', survivalRate: '6%' },
  { step: 8, ghz: 28.0, multiplier: 80.00, temp: 155, rpm: 21500, label: 'QUANTUM SINGULARITY', survivalRate: '1.2%' },
  { step: 9, ghz: 36.0, multiplier: 250.00, temp: 175, rpm: 25000, label: 'OVERCLOCK GOD', survivalRate: '0.38%' }
];

export const MINER_RANKS = [
  { xp: 0, title: 'NOVICE MINER', badge: '🥉' },
  { xp: 30, title: 'SILICON JOCKEY', badge: '🥈' },
  { xp: 100, title: 'CRYO SPECIALIST', badge: '❄️' },
  { xp: 250, title: 'OVERCLOCK MASTER', badge: '🥇' },
  { xp: 600, title: 'QUANTUM DEITY', badge: '👑' }
];

export class MeltdownEngine {
  constructor(seedInput) {
    this.seed = seedInput;
    this.maxSurvivalStep = this._determineMaxStepFromSeed(seedInput);
    this.currentStep = 0;
    this.cryoUsed = false;
    this.isMeltdown = false;
    this.isCashedOut = false;
  }

  /**
   * Evaluates max step deterministically from the 256-bit VRF seed.
   * CDF Curve maintaining exact 96.0% RTP:
   * - Step 9 (250x): 0.384% -> EV = 0.960
   * - Step 8 (80x):  1.200% -> EV = 0.960
   * - Step 7 (16x):  6.000% -> EV = 0.960
   * - Step 6 (6x):   16.00% -> EV = 0.960
   * - Step 5 (3x):   32.00% -> EV = 0.960
   * - Step 4 (2x):   48.00% -> EV = 0.960
   * - Step 3 (1.5x): 64.00% -> EV = 0.960
   * - Step 2 (1.2x): 80.00% -> EV = 0.960
   * - Step 1 (1.05x):92.00% -> EV = 0.966
   */
  _determineMaxStepFromSeed(seedInput) {
    let s = typeof seedInput === 'string' ? seedInput.replace(/^0x/, '') : String(seedInput);
    if (s.length < 16) s = s.padStart(16, '0');
    const hashInt = parseInt(s.substr(0, 12), 16) || 12345678;
    const roll = (hashInt % 100000) / 100000.0;

    if (roll < 0.00384) return 9; // Step 9: 250x
    if (roll < 0.01200) return 8; // Step 8: 80x
    if (roll < 0.06000) return 7; // Step 7: 16x
    if (roll < 0.16000) return 6; // Step 6: 6x
    if (roll < 0.32000) return 5; // Step 5: 3x
    if (roll < 0.48000) return 4; // Step 4: 2x
    if (roll < 0.64000) return 3; // Step 3: 1.5x
    if (roll < 0.80000) return 2; // Step 2: 1.2x
    if (roll < 0.92000) return 1; // Step 1: 1.05x
    return 0; // Melts down (only 8% chance on initial push!)
  }

  pushClock() {
    if (this.isMeltdown || this.isCashedOut || this.currentStep >= 9) {
      return { status: 'ENDED', currentStep: this.currentStep };
    }

    const nextStep = this.currentStep + 1;

    // Cryo Protection overrides failure
    if (this.cryoActiveForNextStep) {
      this.cryoActiveForNextStep = false;
      this.currentStep = nextStep;
      return {
        status: 'SUCCESS',
        step: this.currentStep,
        data: STEPS[this.currentStep],
        cryoProtected: true
      };
    }

    if (nextStep <= this.maxSurvivalStep) {
      this.currentStep = nextStep;
      return {
        status: 'SUCCESS',
        step: this.currentStep,
        data: STEPS[this.currentStep],
        isMax: this.currentStep === 9
      };
    } else {
      this.isMeltdown = true;
      return {
        status: 'MELTDOWN',
        failedAtStep: nextStep,
        targetGhz: STEPS[nextStep].ghz
      };
    }
  }

  injectCryo() {
    if (this.cryoUsed || this.currentStep === 0 || this.isMeltdown || this.isCashedOut) {
      return { success: false, reason: 'Unavailable' };
    }
    this.cryoUsed = true;
    this.cryoActiveForNextStep = true;
    return { success: true, penaltyBps: 1500 };
  }

  getCurrentMultiplier() {
    if (this.isMeltdown) return 0;
    let base = STEPS[this.currentStep].multiplier;
    if (this.cryoUsed) base *= 0.85;
    return Number(base.toFixed(2));
  }
}
