class AudioManager {
  constructor() {
    this.context = null;
    this.master = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.enabled = true;
  }

  ensureContext() {
    if (!this.context) {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtor) return null;
      this.context = new AudioCtor();
      this.master = this.context.createGain();
      this.master.gain.value = 0.12;
      this.master.connect(this.context.destination);
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    return this.context;
  }

  setMuted(value) {
    this.enabled = !value;
    if (!this.enabled) this.stopMusic();
    else this.startMusic();
    const btn = document.getElementById('muteBtn');
    if (btn) btn.textContent = this.enabled ? '🔊' : '🔇';
  }

  tone({ frequency = 220, duration = 0.12, type = 'sine', volume = 0.08, sweep = 0 }) {
    if (!this.enabled) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.master) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (sweep) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + sweep), ctx.currentTime + duration);
    }

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(volume, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.03);
  }

  playShoot() {
    this.tone({ frequency: 180, duration: 0.12, type: 'sawtooth', volume: 0.07, sweep: 130 });
    setTimeout(() => this.tone({ frequency: 120, duration: 0.08, type: 'triangle', volume: 0.05, sweep: -30 }), 40);
  }

  playCoin() {
    this.tone({ frequency: 540, duration: 0.09, type: 'triangle', volume: 0.06, sweep: 130 });
    setTimeout(() => this.tone({ frequency: 720, duration: 0.09, type: 'triangle', volume: 0.06, sweep: 180 }), 45);
  }

  playHole() {
    this.tone({ frequency: 420, duration: 0.16, type: 'sine', volume: 0.08, sweep: 180 });
    setTimeout(() => this.tone({ frequency: 540, duration: 0.18, type: 'triangle', volume: 0.06, sweep: 180 }), 80);
    setTimeout(() => this.tone({ frequency: 700, duration: 0.21, type: 'triangle', volume: 0.06, sweep: 220 }), 150);
  }

  playTrain() {
    this.tone({ frequency: 440, duration: 0.12, type: 'square', volume: 0.05, sweep: 90 });
    setTimeout(() => this.tone({ frequency: 600, duration: 0.11, type: 'square', volume: 0.05, sweep: 130 }), 60);
  }

  playError() {
    this.tone({ frequency: 180, duration: 0.12, type: 'sawtooth', volume: 0.04, sweep: -40 });
  }

  startMusic() {
    if (!this.enabled) return;
    if (this.musicTimer) return;
    const notes = [220, 277, 330, 392, 330, 277, 220, 247];
    this.musicTimer = setInterval(() => {
      const note = notes[this.musicStep % notes.length];
      this.tone({ frequency: note, duration: 0.24, type: 'triangle', volume: 0.03, sweep: 0 });
      this.musicStep += 1;
    }, 420);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

window.audioManager = new AudioManager();
