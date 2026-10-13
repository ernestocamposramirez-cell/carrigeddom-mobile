// ==========================================
// audio.js - Web Audio API + Sonidos de Powerup
// ==========================================

class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = false;

        // --- Música de fondo ---
        this.bgMusic = new Audio('assets/audio/background-music.mp3');
        this.bgMusic.loop = true;
        this.bgMusic.volume = 0.4;

        // --- Sonido de Chainsaw (loop mientras el powerup está activo) ---
        this.chainsawAudio = new Audio('assets/audio/chainsaw.wav');
        this.chainsawAudio.loop = true;
        this.chainsawAudio.volume = 0.55;
        this._chainsawPlaying = false;

        // --- Sonido de Nitro (se reproduce una vez al activar) ---
        this.nitroAudio = new Audio('assets/audio/nitro.wav');
        this.nitroAudio.loop = false;
        this.nitroAudio.volume = 0.7;

        // --- Sonido de Risa (se reproduce una vez al activar motosierra) ---
        this.laughAudio = new Audio('assets/audio/chainsaw_laugh.wav');
        this.laughAudio.loop = false;
        this.laughAudio.volume = 0.6;

        // --- Sonido de Choque (crash contra estanterías) ---
        this.crashAudio = new Audio('assets/audio/crash.wav');
        this.crashAudio.loop = false;
        this.crashAudio.volume = 0.45;

        // --- Sonidos de Pánico (pánico de peatones) ---
        this.panicSounds = [
            new Audio('assets/audio/panic1.wav'),
            new Audio('assets/audio/panic2.wav')
        ];
        this.panicSounds.forEach(a => { a.loop = false; a.volume = 0.35; });

        // --- Sonidos de Golpe (hit contra peatones) ---
        this.hitSounds = [
            new Audio('assets/audio/hit1.wav'),
            new Audio('assets/audio/hit2.wav'),
            new Audio('assets/audio/hit3.wav')
        ];
        this.hitSounds.forEach(a => { a.loop = false; a.volume = 0.4; });

        // --- Sonido de Stepover (pasar sobre un cadáver) ---
        this.stepoverAudio = new Audio('assets/audio/stepover.wav');
        this.stepoverAudio.loop = false;
        this.stepoverAudio.volume = 0.3;

        // --- Sonido de Combo (atropellar 4 peatones) ---
        this.comboAudio = new Audio('assets/audio/afterhit3.wav');
        this.comboAudio.loop = false;
        this.comboAudio.volume = 0.5;

        // --- Sonidos de Final de Partida ---
        this.applauseAudio = new Audio('assets/audio/applause.wav');
        this.applauseAudio.loop = false;
        this.applauseAudio.volume = 0.5;

        this.outroMusic = new Audio('assets/audio/outro.mp3');
        this.outroMusic.loop = true;
        this.outroMusic.volume = 0.6;

        // La activación se delega en start(), llamado desde game.js,
        // para unificar clic y teclado en un único flujo de activación.
    }

    // ─── Arranque: llamado por game.js al primer clic o tecla ─────────────────
    //
    // Orden de operaciones:
    //   1. Resume el AudioContext (política de autoplay del navegador)
    //   2. Dispara un buffer silencioso de 1 muestra  ← clave en Chrome/Firefox:
    //      sin producir audio real el contexto puede quedarse bloqueado aunque
    //      su estado sea 'running'
    //   3. Marca enabled = true y arranca la música de fondo
    async start() {
        if (this.enabled) return;

        // Paso 1 – reanudar contexto suspendido
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        // Paso 2 – buffer silencioso de desbloqueo
        try {
            const silentBuffer = this.ctx.createBuffer(1, 1, this.ctx.sampleRate);
            const silentSource = this.ctx.createBufferSource();
            silentSource.buffer = silentBuffer;
            silentSource.connect(this.ctx.destination);
            silentSource.start(0);
        } catch (e) {
            console.warn('AudioManager: buffer silencioso falló', e);
        }

        // Paso 3 – activar sistema y arrancar música
        this.enabled = true;
        this.playBackgroundMusic();
    }

    // ─── Música de fondo ───────────────────────────────────────────────────────

    playBackgroundMusic() {
        this.bgMusic.play().catch(err => console.error('BGMusic error:', err));
    }

    stopBackgroundMusic() {
        this.bgMusic.pause();
        this.bgMusic.currentTime = 0;
    }

    // ─── Chainsaw: loop mientras el estado está activo ─────────────────────────

    /**
     * Debe llamarse cada frame mientras hasChainsaws === true.
     * Solo dispara el play() la primera vez.
     */
    startChainsaw() {
        if (!this.enabled || this._chainsawPlaying) return;
        this.chainsawAudio.currentTime = 0;
        this.chainsawAudio.play().catch(err => console.warn('Chainsaw audio:', err));
        this._chainsawPlaying = true;
    }

    /**
     * Para el loop de motosierra cuando el powerup expira.
     */
    stopChainsaw() {
        if (!this._chainsawPlaying) return;
        this.chainsawAudio.pause();
        this.chainsawAudio.currentTime = 0;
        this._chainsawPlaying = false;
    }

    // ─── Nitro: disparo único al activarse ─────────────────────────────────────

    playNitro() {
        if (!this.enabled) return;
        this.nitroAudio.currentTime = 0;
        this.nitroAudio.play().catch(err => console.warn('Nitro audio:', err));
    }

    // ─── Chainsaw Laugh: disparo único al activarse ───────────────────────────

    playChainsawLaugh() {
        if (!this.enabled) return;
        this.laughAudio.currentTime = 0;
        this.laughAudio.play().catch(err => console.warn('Laugh audio:', err));
    }

    // ─── Sonido agudo de metal (sintetizado, rueda) ────────────────────────────

    playSqueak() {
        if (!this.enabled) return;
        const osc  = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(800 + Math.random() * 400, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.2);
    }

    // ─── Pánico y Golpes: selección aleatoria de archivo ───────────────────────

    playPanic() {
        if (!this.enabled) return;
        const sound = this.panicSounds[Math.floor(Math.random() * this.panicSounds.length)];
        sound.currentTime = 0;
        sound.play().catch(err => console.warn('Panic audio:', err));
    }

    playHit() {
        if (!this.enabled) return;
        const sound = this.hitSounds[Math.floor(Math.random() * this.hitSounds.length)];
        sound.currentTime = 0;
        sound.play().catch(err => console.warn('Hit audio:', err));
    }

    playStepover() {
        if (!this.enabled) return;
        this.stepoverAudio.currentTime = 0;
        this.stepoverAudio.play().catch(err => console.warn('Stepover audio:', err));
    }

    playComboSound() {
        if (!this.enabled) return;
        this.comboAudio.currentTime = 0;
        this.comboAudio.play().catch(err => console.warn('Combo audio:', err));
    }

    stopAllGameplayAudio() {
        this.stopBackgroundMusic();
        this.stopChainsaw();

        // Parar y resetear cualquier otro efecto que pudiera estar sonando
        const sfxList = [
            this.nitroAudio,
            this.laughAudio,
            this.crashAudio,
            this.stepoverAudio,
            this.comboAudio,
            ...this.panicSounds,
            ...this.hitSounds
        ];

        sfxList.forEach(audio => {
            if (audio) {
                audio.pause();
                audio.currentTime = 0;
            }
        });
    }

    playApplause() {
        if (!this.enabled) return;
        this.stopAllGameplayAudio();
        this.applauseAudio.currentTime = 0;
        return this.applauseAudio.play().catch(err => console.warn('Applause audio:', err));
    }

    playOutro() {
        if (!this.enabled) return;
        this.outroMusic.currentTime = 0;
        this.outroMusic.play().catch(err => console.warn('Outro music:', err));
    }

    // ─── Efectos sintetizados (crash, pickup) ──────────────────────────────────

    playSound(type) {
        if (!this.enabled) return;

        switch (type) {
            case 'crash':
                this.crashAudio.currentTime = 0;
                this.crashAudio.play().catch(err => console.warn('Crash audio:', err));
                return; // Usamos el archivo de audio, salimos del switch

            case 'pickup':
                // Mantenemos el sintetizado para el pickup genérico
                const osc  = this.ctx.createOscillator();
                const gain = this.ctx.createGain();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(600, this.ctx.currentTime);
                osc.frequency.setValueAtTime(800, this.ctx.currentTime + 0.1);
                gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
                osc.connect(gain);
                gain.connect(this.ctx.destination);
                osc.start();
                osc.stop(this.ctx.currentTime + 1.0);
                break;

            default:
                return;
        }
    }
}

// ─── Instancia global ─────────────────────────────────────────────────────────
// Se registra en window para que game.js, npc.js y player.js la encuentren
// sin importar el orden de carga de los <script>.
window.audioManager = new AudioManager();
