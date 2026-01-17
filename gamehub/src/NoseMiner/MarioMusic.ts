// Simple synth to play Mario-style tunes using Web Audio API

class MarioMusicPlayer {
    private ctx: AudioContext | null = null;
    private isPlaying: boolean = false;
    private tempo: number = 180;
    private oscs: OscillatorNode[] = [];
    private timeoutId: number | null = null;
  
    init() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    }
  
    playNote(frequency: number, duration: number, startTime: number, type: OscillatorType = 'square') {
      if (!this.ctx) return;
  
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
  
      osc.type = type;
      osc.frequency.value = frequency;
  
      osc.connect(gain);
      gain.connect(this.ctx.destination);
  
      osc.start(startTime);
      osc.stop(startTime + duration);
  
      // Envelope to avoid clicking
      gain.gain.setValueAtTime(0.1, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration - 0.05);
  
      this.oscs.push(osc);
    }
  
    playTheme(loop: boolean = true) {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
          this.ctx.resume();
      }
      this.isPlaying = true;
  
      const now = this.ctx.currentTime;
      const beat = 60 / this.tempo;
  
      // Notes frequencies (approximate)
      const E5 = 659.25;
      const C5 = 523.25;
      const G5 = 783.99;
      const g4 = 392.00;
      const C4 = 261.63;
      const G4 = 392.00;
      const E4 = 329.63;
      const A4 = 440.00;
      const B4 = 493.88;
      const Bb4 = 466.16;
  
      // Intro sequence + simplified theme
      const notes = [
          // Intro
          { freq: E5, dur: 1 }, { freq: E5, dur: 1 }, { freq: 0, dur: 1 }, { freq: E5, dur: 1 },
          { freq: 0, dur: 1 }, { freq: C5, dur: 1 }, { freq: E5, dur: 2 },
          { freq: G5, dur: 4 },
          { freq: g4, dur: 4 },
          // Main Theme (Simplified)
          { freq: C5, dur: 3 }, { freq: G4, dur: 1 }, { freq: E4, dur: 4 },
          { freq: A4, dur: 2 }, { freq: B4, dur: 2 }, { freq: Bb4, dur: 1 }, { freq: A4, dur: 3 },
          { freq: G4, dur: 2 }, { freq: E5, dur: 2 }, { freq: G5, dur: 2 },
          { freq: A4, dur: 4 }, { freq: 0, dur: 2 }
      ];
  
      let time = now;
      let totalDuration = 0;

      notes.forEach(note => {
          if (note.freq > 0) {
              this.playNote(note.freq, note.dur * beat * 0.8, time);
          }
          time += note.dur * beat;
          totalDuration += note.dur * beat;
      });

      if (loop && this.isPlaying) {
          this.timeoutId = window.setTimeout(() => {
              if (this.isPlaying) this.playTheme(true);
          }, totalDuration * 1000);
      }
    }

    playWin() {
        this.isPlaying = false; // Stop loop
        this.stop(); // Stop current sounds
        // Removed yippee call per user request
        this.init();
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        const beat = 0.1;

        // Win fanfare
        const notes = [
            523.25, 659.25, 783.99, 1046.50, 0, 783.99, 1046.50
        ];
        
        let time = now;
        notes.forEach((freq, i) => {
             if (freq > 0) this.playNote(freq, beat * (i === notes.length -1 ? 4 : 1), time);
             time += beat * 1.5;
        });
    }

    playSample(url: string) {
        try {
            const audio = new Audio(url);
            audio.volume = 0.5;
            audio.play().catch(e => console.warn('Audio play failed:', e));
        } catch (e) {
            console.warn('Audio init failed:', e);
        }
    }

    playYahoo() {
        // "Wahoo" - removed per user request
    }

    playYippee() {
        // "Yippee" - removed per user request
    }

    playAha() {
        // "Aha" / "Haha" - removed per user request
    }

    playBump() {
        // "Bump" (hitting a wall/rock)
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, t);
        osc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
        
        gain.gain.setValueAtTime(0.5, t);
        gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(t);
        osc.stop(t + 0.1);
    }

    stop() {
        this.isPlaying = false;
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        this.oscs.forEach(o => {
            try { o.stop(); } catch(e) {}
        });
        this.oscs = [];
    }
  }
  
  export const marioMusic = new MarioMusicPlayer();
  