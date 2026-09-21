/**
 * Meltdown - Chain Casino SDK Bridge
 * Supports both embedded Chain.wtf host iframe environment and Standalone Simulator mode.
 */

export class MeltdownBridge {
  constructor() {
    this.isEmbedded = window.parent !== window;
    this.hostApi = null;
    this.state = {
      connected: false,
      balance: '1000.00',
      currency: 'USDC',
      minWager: 0.1,
      maxWager: 100.0,
      activeSession: null
    };
    this.listeners = {
      onStateChange: []
    };
  }

  async init() {
    if (this.isEmbedded) {
      try {
        window.addEventListener('message', this._handleHostMessage.bind(this));
        window.parent.postMessage({ type: 'CHAIN_GAME_READY', gameId: 'meltdown' }, '*');
      } catch (err) {
        this._initStandalone();
      }
    } else {
      this._initStandalone();
    }
  }

  _initStandalone() {
    this.state.connected = true;
    this.state.balance = '1000.00';
    this._emitStateChange();
  }

  _handleHostMessage(event) {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'CHAIN_HOST_SNAPSHOT') {
      this.state.balance = data.balance || this.state.balance;
      this.state.currency = data.currency || 'USDC';
      this.state.minWager = data.minWager || 0.1;
      this.state.maxWager = data.maxWager || 100.0;
      this.state.connected = true;
      this._emitStateChange();
    }
  }

  subscribeState(callback) {
    this.listeners.onStateChange.push(callback);
    callback(this.state);
  }

  _emitStateChange() {
    this.listeners.onStateChange.forEach(cb => cb(this.state));
  }

  async openSession(wagerAmount) {
    const wager = parseFloat(wagerAmount);
    const currentBal = parseFloat(this.state.balance);

    if (wager > currentBal) {
      throw new Error('Insufficient balance');
    }

    if (this.isEmbedded && this.hostApi) {
      return await this.hostApi.openSession({ wager });
    } else {
      // Deduct wager
      this.state.balance = (currentBal - wager).toFixed(2);
      this._emitStateChange();

      // Generate 256-bit VRF seed
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      const vrfSeed = '0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      this.state.activeSession = {
        sessionId: 'melt_' + Date.now(),
        wager,
        vrfSeed
      };

      return {
        sessionId: this.state.activeSession.sessionId,
        vrfSeed: vrfSeed
      };
    }
  }

  async revealOutcome(multiplier) {
    if (!this.state.activeSession) return;

    const wager = this.state.activeSession.wager;
    const payout = wager * multiplier;
    const currentBal = parseFloat(this.state.balance);
    const newBal = (currentBal + payout).toFixed(2);

    this.state.balance = newBal;
    this.state.activeSession = null;
    this._emitStateChange();

    if (this.isEmbedded && window.parent) {
      window.parent.postMessage({
        type: 'CHAIN_REVEAL_OUTCOME',
        multiplier,
        payout
      }, '*');
    }

    return { payout, newBalance: newBal };
  }
}

export const meltdownBridge = new MeltdownBridge();
