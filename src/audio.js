/**
 * Procedural Web Audio arcade sound engine for Bricks 3D.
 * Zero external audio files required; unlocks cleanly on first user gesture.
 */

export class ArcadeAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  _tone(freq, duration = 0.09, type = "triangle", gainVal = 0.12, endFreq = null) {
    if (this.muted) return;
    this.unlock();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (endFreq !== null) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, endFreq), now + duration);
    }

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }

  paddleHit() {
    this._tone(320, 0.08, "triangle", 0.14, 480);
  }

  wallHit() {
    this._tone(210, 0.05, "sine", 0.09, 170);
  }

  brickHit(combo = 1, armored = false) {
    if (armored) {
      this._tone(160, 0.09, "square", 0.09, 110);
      return;
    }
    const semitone = Math.min(combo, 14);
    const freq = 360 * Math.pow(2, semitone / 12);
    this._tone(freq, 0.11, "triangle", 0.13, freq * 1.25);
  }

  powerUp() {
    this._tone(523.25, 0.09, "sine", 0.12, 659.25);
    setTimeout(() => this._tone(783.99, 0.14, "sine", 0.12, 1046.5), 70);
  }

  worldSwitch() {
    this._tone(280, 0.12, "sine", 0.1, 560);
    setTimeout(() => this._tone(560, 0.14, "triangle", 0.09, 740), 65);
  }

  lifeLost() {
    this._tone(260, 0.22, "sawtooth", 0.1, 95);
  }

  levelClear() {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, idx) => {
      setTimeout(() => this._tone(n, 0.18, "triangle", 0.13), idx * 90);
    });
  }

  explosion() {
    this._tone(135, 0.28, "sawtooth", 0.18, 38);
    setTimeout(() => this._tone(90, 0.22, "square", 0.12, 32), 45);
  }

  bumperBoing() {
    this._tone(240, 0.16, "sine", 0.15, 620);
  }

  portalWarp() {
    this._tone(420, 0.14, "sine", 0.12, 960);
    setTimeout(() => this._tone(960, 0.14, "triangle", 0.1, 520), 60);
  }

  laserShot() {
    this._tone(920, 0.08, "sawtooth", 0.08, 280);
  }

  bossHit() {
    this._tone(190, 0.14, "square", 0.14, 110);
    setTimeout(() => this._tone(310, 0.09, "triangle", 0.1, 210), 40);
  }

  bossDefeat() {
    this.explosion();
    const fanfare = [523.25, 659.25, 783.99, 1046.5, 1318.5];
    fanfare.forEach((n, idx) => {
      setTimeout(() => this._tone(n, 0.22, "triangle", 0.14), 140 + idx * 95);
    });
  }
}
