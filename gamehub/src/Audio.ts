// Audio Synthesis Manager

class AudioManager {
  ctx: AudioContext | null = null;
  masterGain: GainNode | null = null;
  isPlayingMusic: boolean = false;
  nextNoteTime: number = 0.0;
  current16thNote: number = 0;
  timerID: number | null = null;
  tempo: number = 110.0;
  lookahead: number = 25.0; // How frequently to call scheduling function (in milliseconds)
  scheduleAheadTime: number = 0.1; // How far ahead to schedule audio (sec)

  constructor() {
    // Initialize on first user interaction
    window.addEventListener('click', () => this.init(), { once: true });
    window.addEventListener('keydown', () => this.init(), { once: true });
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
            console.log("Audio Context Resumed");
            this.startMusic();
        });
      }
      return;
    }
    this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3; // Master volume
    this.masterGain.connect(this.ctx.destination);
    console.log("Audio Initialized");
    
    // Start music automatically
    this.startMusic();
  }

  // --- MUSIC SEQUENCER ---

  startMusic() {
    if (this.isPlayingMusic || !this.ctx) return;
    this.isPlayingMusic = true;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.timerID = window.setInterval(() => this.scheduler(), this.lookahead);
  }

  stopMusic() {
    this.isPlayingMusic = false;
    if (this.timerID) window.clearInterval(this.timerID);
  }

  scheduler() {
    if (!this.ctx) return;
    // while there are notes that will need to play before the next interval, 
    // schedule them and advance the pointer.
    while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
        this.scheduleNote(this.current16thNote, this.nextNoteTime);
        this.nextNote();
    }
  }

  nextNote() {
    const secondsPerBeat = 60.0 / this.tempo;
    this.nextNoteTime += 0.25 * secondsPerBeat; // Add 1/4 of beat length to time (16th notes)
    this.current16thNote++;
    if (this.current16thNote === 16) {
        this.current16thNote = 0;
    }
  }

  scheduleNote(beatNumber: number, time: number) {
    if (!this.ctx || !this.masterGain) return;

    // --- BASS (8th notes) ---
    // Pattern: D D D D F F G A
    if (beatNumber % 2 === 0) { // Every 8th note
        const step = Math.floor(beatNumber / 2); // 0-7
        let freq = 73.42; // D2
        
        if (step >= 4 && step < 6) freq = 87.31; // F2
        if (step === 6) freq = 98.00; // G2
        if (step === 7) freq = 110.00; // A2

        this.playBass(time, freq);
    }

    // --- ARPEGGIO (16th notes) ---
    // Sparse, futuristic blips
    // D Minor Pentatonic: D F G A C
    const arpNotes = [587.33, 698.46, 783.99, 880.00, 1046.50];
    
    // Play on random 16ths, but consistent within a bar for a groove? 
    // Let's make it random for "generative" feel
    if (Math.random() > 0.7) {
        const freq = arpNotes[Math.floor(Math.random() * arpNotes.length)];
        this.playArp(time, freq);
    }

    // --- HI-HAT (Every off-beat 8th) ---
    if (beatNumber % 4 === 2) {
        this.playHiHat(time);
    }
  }

  playBass(time: number, freq: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, time);

    // Lowpass filter envelope for "pluck" sound
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(0, time);
    filter.frequency.linearRampToValueAtTime(800, time + 0.02);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.2);

    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.3);
  }

  playArp(time: number, freq: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  playHiHat(time: number) {
    if (!this.ctx || !this.masterGain) return;
    // White noise buffer
    const bufferSize = this.ctx.sampleRate * 0.1;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 5000;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.1, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    
    noise.start(time);
  }

  // --- FX ---

  playEngineHum() {
    if (!this.ctx || !this.masterGain) return;
    // Reusing previous logic, maybe make it quieter
  }

  playCrash() {
    if (!this.ctx || !this.masterGain) return;
    
    const bufferSize = this.ctx.sampleRate * 1.0; 
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    
    noise.connect(gain);
    gain.connect(this.masterGain);
    noise.start();
  }

  playScore() {
    if (!this.ctx || !this.masterGain) return;
    
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime); // Higher pitch for clarity over music
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

export const audioManager = new AudioManager();
