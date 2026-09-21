/**
 * Meltdown - Advanced Procedural Overclock Audio Engine
 * Features:
 * - Dynamic continuous turbine drone with real-time RPM frequency modulation
 * - Heartbeat sub-bass pulse accelerating under extreme thermal load (>85°C)
 * - Lightning & electrical arcing crackle SFX
 * - Cryo hiss, blowout explosion, and jackpot fanfare
 */

class OverclockAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;

    // Ambient Drone Nodes
    this.droneOsc = null;
    this.droneGain = null;
    this.droneFilter = null;

    // Heartbeat Interval
    this.heartbeatInterval = null;
  }

  _initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.35, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /**
   * Starts continuous ambient hardware hum that revs up with GHz
   */
  startAmbientDrone() {
    if (this.isMuted || this.droneOsc) return;
    this._initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    this.droneOsc = this.ctx.createOscillator();
    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneGain = this.ctx.createGain();

    this.droneOsc.type = 'sawtooth';
    this.droneOsc.frequency.setValueAtTime(65, t);

    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.setValueAtTime(300, t);

    this.droneGain.gain.setValueAtTime(0.01, t);
    this.droneGain.gain.linearRampToValueAtTime(0.08, t + 0.5);

    this.droneOsc.connect(this.droneFilter);
    this.droneFilter.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    this.droneOsc.start();
  }

  /**
   * Dynamically tunes drone pitch as fans and clock speed rise
   */
  updateDroneRPM(rpm = 2000, temp = 35) {
    if (!this.droneOsc || !this.ctx) return;
    const t = this.ctx.currentTime;
    const targetFreq = 50 + (rpm / 22000) * 180;
    const targetFilter = 200 + (rpm / 22000) * 1200;
    const targetGain = 0.05 + (rpm / 22000) * 0.12;

    this.droneOsc.frequency.setTargetAtTime(targetFreq, t, 0.1);
    this.droneFilter.frequency.setTargetAtTime(targetFilter, t, 0.1);
    this.droneGain.gain.setTargetAtTime(targetGain, t, 0.1);

    // Trigger or update heartbeat under extreme temperature
    if (temp >= 85) {
      this.startHeartbeat(temp);
    } else {
      this.stopHeartbeat();
    }
  }

  stopAmbientDrone() {
    if (!this.droneOsc || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.droneGain.gain.linearRampToValueAtTime(0.001, t + 0.3);
    setTimeout(() => {
      if (this.droneOsc) {
        this.droneOsc.stop();
        this.droneOsc.disconnect();
        this.droneOsc = null;
      }
    }, 350);
    this.stopHeartbeat();
  }

  /**
   * Heartbeat thumper: speed scales with core temperature
   */
  startHeartbeat(temp) {
    if (this.heartbeatInterval) return;
    const bpm = Math.min(180, 80 + (temp - 80) * 1.5);
    const intervalMs = (60 / bpm) * 1000;

    const pulse = () => {
      if (this.isMuted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(55, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.13);
    };

    pulse();
    this.heartbeatInterval = setInterval(pulse, intervalMs);
  }

  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Push Surge with ascending frequency burst
   */
  playPushSurge(step = 1) {
    if (this.isMuted) return;
    this._initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const baseFreq = 140 + step * 90;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(baseFreq * 0.7, t);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.4, t + 0.22);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.25);
  }

  /**
   * Electrical Arc / Lightning Spark Crackle
   */
  playArcCrackle() {
    if (this.isMuted) return;
    this._initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1800, t);
    osc.frequency.exponentialRampToValueAtTime(300, t + 0.08);

    gain.gain.setValueAtTime(0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.09);
  }

  /**
   * Cryo-Coolant Nitrogen Flush
   */
  playCryoHiss() {
    if (this.isMuted) return;
    this._initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.45;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3800, t);
    filter.frequency.exponentialRampToValueAtTime(600, t + 0.42);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.45, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.42);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    whiteNoise.start(t);
    whiteNoise.stop(t + 0.45);
  }

  /**
   * Catastrophic Core Blowout
   */
  playMeltdownBlowout() {
    this.stopAmbientDrone();
    if (this.isMuted) return;
    this._initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // Sub-bass heavy blowout explosion
    const boom = this.ctx.createOscillator();
    const boomGain = this.ctx.createGain();
    boom.type = 'sawtooth';
    boom.frequency.setValueAtTime(160, t);
    boom.frequency.exponentialRampToValueAtTime(15, t + 0.7);

    boomGain.gain.setValueAtTime(0.9, t);
    boomGain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

    boom.connect(boomGain);
    boomGain.connect(this.masterGain);

    boom.start(t);
    boom.stop(t + 0.72);
  }

  /**
   * Harvest Fanfare
   */
  playHarvestWin(multiplier = 1.3) {
    this.stopAmbientDrone();
    if (this.isMuted) return;
    this._initContext();
    if (!this.ctx) return;

    const notes = multiplier >= 10 
      ? [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98] // Major Jackpot
      : [440, 554.37, 659.25, 880];

    notes.forEach((freq, idx) => {
      const t = this.ctx.currentTime + idx * 0.07;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.35, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.23);
    });
  }

  playClick() {
    if (this.isMuted) return;
    this._initContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.04);
  }
}

export const overclockAudio = new OverclockAudioEngine();
