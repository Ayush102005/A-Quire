/**
 * Ambient Audio Synthesizer for A-Quire Focus Mode.
 * Generates binaural beats (Alpha waves) and soft rain pink noise
 * purely via browser Web Audio API — zero network downloads, instant, 100% offline.
 */
class AmbientAudioSynthesizer {
  constructor() {
    this.ctx = null;
    this.gainNode = null;
    this.sourceNodes = [];
    this.currentSound = 'none'; // 'none' | 'alpha' | 'rain'
    this.volume = 0.35;
  }

  _initContext() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        this.gainNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.gainNode && this.ctx) {
      this.gainNode.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  stop() {
    this.sourceNodes.forEach((node) => {
      try {
        if (typeof node.stop === 'function') node.stop();
        node.disconnect();
      } catch (e) {
        // Ignore disconnect errors
      }
    });
    this.sourceNodes = [];
    this.currentSound = 'none';
  }

  playAlphaBeats() {
    this._initContext();
    this.stop();
    if (!this.ctx) return;
    this.currentSound = 'alpha';

    // 10Hz Alpha wave difference between stereo channels (e.g. 216Hz and 226Hz)
    const merger = this.ctx.createChannelMerger(2);

    const oscLeft = this.ctx.createOscillator();
    const oscRight = this.ctx.createOscillator();
    oscLeft.type = 'sine';
    oscRight.type = 'sine';
    oscLeft.frequency.value = 216;
    oscRight.frequency.value = 226;

    // Harmonic warm drone (108Hz sub-octave)
    const drone = this.ctx.createOscillator();
    drone.type = 'sine';
    drone.frequency.value = 108;
    const droneGain = this.ctx.createGain();
    droneGain.gain.value = 0.25;
    drone.connect(droneGain);
    droneGain.connect(merger, 0, 0);
    droneGain.connect(merger, 0, 1);

    oscLeft.connect(merger, 0, 0);
    oscRight.connect(merger, 0, 1);
    merger.connect(this.gainNode);

    oscLeft.start();
    oscRight.start();
    drone.start();

    this.sourceNodes = [oscLeft, oscRight, drone, droneGain, merger];
  }

  playRain() {
    this._initContext();
    this.stop();
    if (!this.ctx) return;
    this.currentSound = 'rain';

    // Generate 3 seconds of looped pink noise
    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.12;
      b6 = white * 0.115926;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Filter to soft raindrops
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);

    whiteNoise.start();
    this.sourceNodes = [whiteNoise, filter];
  }
}

export const ambientAudio = new AmbientAudioSynthesizer();
