// @ts-nocheck
export const goofyMusic = {
    ctx: null,
    isPlaying: false,
    interval: null,
    
    init() {
        if (!this.ctx && typeof window !== 'undefined') {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
    },

    playNote(freq, type = 'triangle', duration = 0.1) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        // "Goofy" pitch bend
        osc.frequency.linearRampToValueAtTime(freq * 0.8, this.ctx.currentTime + duration);
        
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    },

    start() {
        if (this.isPlaying) return;
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        this.isPlaying = true;
        
        let beat = 0;
        this.interval = setInterval(() => {
            // Goofy "Oom-pah" rhythm
            if (beat % 4 === 0) this.playNote(150, 'sawtooth', 0.2); // Oom (Low)
            if (beat % 4 === 2) this.playNote(150, 'sawtooth', 0.2); 
            
            // Goofy Melody (Randomized Pentatonic Wobbly)
            if (Math.random() > 0.3) {
                const notes = [300, 350, 400, 450, 500, 600]; // Goofy scale
                const note = notes[Math.floor(Math.random() * notes.length)];
                this.playNote(note, 'sine', 0.15);
            }
            
            // Occasional "Boing"
            if (Math.random() > 0.9) {
                 this.playNote(800, 'square', 0.3); // High squeak
            }

            beat++;
        }, 180); // ~160 BPM
    },

    stop() {
        this.isPlaying = false;
        if (this.interval) clearInterval(this.interval);
    }
};
