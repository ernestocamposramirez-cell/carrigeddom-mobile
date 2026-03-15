// ==========================================
// game.js - Orchestrator and Game Loop logic
// ==========================================

class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');

        // 1. Configurar dimensiones
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;

        // 2. Estados básicos y Cámara
        this.chaos = 0;
        this.camera = { x: 0, y: 0 };
        this.shakeTime = 0;
        this.audioStarted = false;
        this.timeLeft = 120;
        this.gameOver = false;

        // Sistema de combos para audio
        this.hitCounter = 0;
        this.hitTimer = 0;

        // 3. Carga de Sprites
        // Textura de suelo
        this.floorTexture = new Image();
        this.floorTexture.src = 'assets/sprites/suelo.png';
        this._floorPattern = null; // se crea la primera vez que el canvas esté listo

        // Estado Normal
        this.playerSpritesheet = new Image();
        this.playerSpritesheet.src = 'assets/sprites/jugador normal.png';

        // Estado Nitro
        this.nitroSpritesheet = new Image();
        this.nitroSpritesheet.src = 'assets/sprites/jugador nitro.png';

        // Estado Motosierras
        this.chainsawSpritesheet = new Image();
        this.chainsawSpritesheet.src = 'assets/sprites/jugador chainsaw.png';

        // Estado Combinado: Motosierras + Nitro (máxima prioridad visual)
        this.chainsawNitroSpritesheet = new Image();
        this.chainsawNitroSpritesheet.src = 'assets/sprites/jugador chainsaw+nitro.png';

        // Sprites de estanterías: grupos 1-5, estados 1-3 → claves '1-1' … '5-3'
        this.shelfSprites = {};
        for (let g = 1; g <= 5; g++) {
            for (let s = 1; s <= 3; s++) {
                const img = new Image();
                img.src = `assets/sprites/estanteria ${g}-${s}.png`;
                this.shelfSprites[`${g}-${s}`] = img;
            }
        }
        // Sprites de peatones: ped1.png … ped6.png (índices 0-5)
        this.pedestrianSprites = [];
        for (let i = 1; i <= 6; i++) {
            const img = new Image();
            img.src = `assets/sprites/ped${i}.png`;
            this.pedestrianSprites.push(img);
        }

        // Sprites de Powerups (Pickups)
        this.pickupSprites = {
            'NITRO': new Image(),
            'CHAINSAWS': new Image()
        };
        this.pickupSprites['NITRO'].src = 'assets/sprites/nitro.png';
        this.pickupSprites['CHAINSAWS'].src = 'assets/sprites/chainsaw.png';

        // 4. Entidades
        this.player = new Cart(0, 0);
        this.environment = [];
        this.npcs = [];
        this.pickups = [];

        // 5. UI References
        this.scoreEl = document.getElementById('score');
        this.speedEl = document.getElementById('speed');
        this.timerEl = document.getElementById('timer');
        this.powerupEl = document.getElementById('powerup-display');
        this.menuEl = document.getElementById('main-menu');
        this.gameOverEl = document.getElementById('game-over');
        this.finalStatsEl = document.getElementById('final-stats');
        this.outroImgEl = document.getElementById('outro-img');
        this.creditsEl = document.getElementById('credits-container');

        // Inicializar el sistema de entrada y el nivel
        this.setupStartListener();
        this.buildLevel();
    }

    // Lógica para iniciar audio y quitar cartel con cualquier tecla o clic
    setupStartListener() {
        const startAction = async () => {
            if (!this.audioStarted) {
                this.audioStarted = true;

                // audioManager.start() gestiona internamente el resume()
                // del AudioContext, el buffer de desbloqueo y la música de fondo.
                if (window.audioManager) {
                    await window.audioManager.start();
                }

                // Ocultar el mensaje y el menú principal
                if (this.powerupEl) this.powerupEl.style.display = 'none';
                if (this.menuEl) this.menuEl.style.display = 'none';

                // Limpiar eventos para no repetir esta lógica
                window.removeEventListener('keydown', startAction);
                window.removeEventListener('mousedown', startAction);
            }
        };

        window.addEventListener('keydown', startAction);
        window.addEventListener('mousedown', startAction);

        // Ocultamos inicializaciones innecesarias que ahora están en el Menú Principal
        if (this.powerupEl) this.powerupEl.style.display = 'none';
    }

    buildLevel() {
        const size = 3000;
        const thick = 150;

        // Paredes
        this.environment.push(new Wall(0, -size / 2, size, thick));
        this.environment.push(new Wall(0, size / 2, size, thick));
        this.environment.push(new Wall(-size / 2, 0, thick, size));
        this.environment.push(new Wall(size / 2, 0, thick, size));

        // Estanterías escaladas (Pasillos anchos de 550x650)
        for (let x = -1000; x <= 1000; x += 550) {
            for (let y = -1000; y <= 1000; y += 650) {
                if (Math.abs(x) < 300 && Math.abs(y) < 300) continue;
                const groupID = Math.floor(Math.random() * 5) + 1;
                this.environment.push(new Shelf(x, y, 140, 400, groupID));
            }
        }

        // Clientes
        for (let i = 0; i < 50; i++) {
            this.npcs.push(new Customer(
                Math.random() * 2400 - 1200,
                Math.random() * 2400 - 1200
            ));
        }

        // Powerups
        for (let i = 0; i < 5; i++) {
            let type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
            this.pickups.push(new Pickup(
                Math.random() * 2200 - 1100,
                Math.random() * 2200 - 1100,
                type
            ));
        }
    }

    addChaos(points) {
        this.chaos += points;
        if (this.scoreEl) this.scoreEl.innerText = this.chaos;
    }

    triggerShake() {
        this.shakeTime = 15;
    }

    registerHit() {
        this.hitCounter++;
        this.hitTimer = 1500; // 1.5 segundos para encadenar el siguiente

        if (this.hitCounter >= 4) {
            if (window.audioManager) audioManager.playComboSound();
            this.hitCounter = 0; // Reset tras el grito
        }
    }

    update(dt) {
        if (this.gameOver) return;

        this.timeLeft -= dt / 1000;
        if (this.timeLeft <= 0) {
            this.timeLeft = 0;
            this.handleGameOver();
            return;
        }

        if (this.timerEl) {
            let mins = Math.floor(this.timeLeft / 60);
            let secs = Math.floor(this.timeLeft % 60);
            this.timerEl.innerText = `${mins}:${secs.toString().padStart(2, '0')}`;
        }

        // Timer de combo
        if (this.hitTimer > 0) {
            this.hitTimer -= dt;
            if (this.hitTimer <= 0) this.hitCounter = 0;
        }

        // UI de Powerups
        let activePowerupText = [];
        const pt = this.player.powerupTimers;
        if (pt.nitro > 0) activePowerupText.push(`NITRO: ${Math.ceil(pt.nitro / 60)}s`);
        if (pt.chainsaws > 0) activePowerupText.push(`MOTOSIERRAS: ${Math.ceil(pt.chainsaws / 60)}s`);

        if (this.powerupEl && this.audioStarted) {
            if (activePowerupText.length > 0) {
                this.powerupEl.innerText = activePowerupText.join(' | ');
                this.powerupEl.style.display = 'block';
            } else {
                this.powerupEl.style.display = 'none';
            }
        }

        this.player.updateCart(dt, input.keys);
        let playerVelSq = this.player.velocity.magSq();

        if (this.player.hasNitro && playerVelSq > 10) {
            spawnSmoke(this.player.position.x, this.player.position.y);
        }

        if (this.speedEl) {
            this.speedEl.innerText = Math.floor(Math.sqrt(playerVelSq) * 5);
        }

        for (let i = globalParticles.length - 1; i >= 0; i--) {
            globalParticles[i].update(dt);
            if (globalParticles[i].life <= 0) globalParticles.splice(i, 1);
        }

        for (let p of this.pickups) p.update(dt);
        for (let npc of this.npcs) npc.updateNPC(dt, this.player);

        this.handleCollisions();

        // Cámara
        let targetX = -this.player.position.x + this.width / 2;
        let targetY = -this.player.position.y + this.height / 2;
        this.camera.x += (targetX - this.camera.x) * 0.1;
        this.camera.y += (targetY - this.camera.y) * 0.1;

        if (this.shakeTime > 0) this.shakeTime--;
    }

    handleGameOver() {
        if (this.gameOver) return;
        this.gameOver = true;

        // 1. Mostrar pantalla de Game Over y puntuación
        if (this.gameOverEl) this.gameOverEl.style.display = 'flex';
        if (this.finalStatsEl) this.finalStatsEl.innerText = this.chaos;

        // 2. Lógica de Audio: Aplausos y luego Outro
        if (window.audioManager) {
            audioManager.playApplause().then(() => {
                // El navegador espera a que termine el audio si es una promesa o usamos el evento ended
                // Como Audio.play() devuelve una promesa de inicio, detectamos el final:
                audioManager.applauseAudio.onended = () => {
                    audioManager.playOutro();
                };
            });
        }

        // 3. Slideshow de imágenes (outro1 a outro6)
        let currentOutro = 1;
        const outroInterval = setInterval(() => {
            currentOutro++;
            if (currentOutro > 6) {
                clearInterval(outroInterval);
                // Cuando terminan las fotos, mostramos los créditos
                if (this.creditsEl) {
                    this.creditsEl.style.display = 'block';
                }
                return;
            }
            if (this.outroImgEl) {
                this.outroImgEl.src = `assets/sprites/outro${currentOutro}.png`;
            }
        }, 10000); // 5 segundos por imagen antes de los créditos
    }

    handleCollisions() {
        for (let env of this.environment) {
            let res = resolveCollision(this.player, env);
            if (res && env instanceof Shelf) {
                env.hit(res.magnitude);
                if (res.magnitude > 5) this.triggerShake();
            }
            for (let npc of this.npcs) resolveCollision(npc, env);
        }

        for (let npc of this.npcs) {
            if (npc.state === 'DEAD') {
                // Si está muerto, comprobamos si pasamos por encima para el sonido
                if (npc.stepoverCooldown <= 0 && checkAABBCollision(this.player, npc)) {
                    if (window.audioManager) audioManager.playStepover();
                    npc.stepoverCooldown = 800; // 0.8s de cooldown por cadáver
                }
                continue;
            }
            if (checkAABBCollision(this.player, npc)) {
                let speed = this.player.velocity.mag();
                if (speed > 3 || this.player.hasChainsaws) {
                    let pts = npc.hit(speed, this.player.hasChainsaws);
                    if (pts > 0) {
                        this.addChaos(pts);
                        if (pts >= 50) {
                            this.triggerShake();
                            this.registerHit(); // Solo cuenta para el combo si muere
                        }
                        let pushDir = this.player.velocity.normalize();
                        if (pushDir.magSq() === 0) pushDir = new Vector2(1, 0);
                        npc.velocity = pushDir.mult(speed * 1.5);
                    }
                } else {
                    resolveCollision(this.player, npc);
                }
            }
        }

        for (let i = this.pickups.length - 1; i >= 0; i--) {
            let p = this.pickups[i];
            if (checkAABBCollision(this.player, p)) {
                this.player.activatePowerup(p.type);
                this.pickups.splice(i, 1);
                setTimeout(() => {
                    let type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
                    this.pickups.push(new Pickup(Math.random() * 2200 - 1100, Math.random() * 2200 - 1100, type));
                }, 5000);
            }
        }
    }

    draw() {
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        this.ctx.save();
        let sx = 0, sy = 0;
        if (this.shakeTime > 0) {
            sx = (Math.random() - 0.5) * 15;
            sy = (Math.random() - 0.5) * 15;
        }

        // Zoom out on mobile devices for better visibility
        const isMobile = window.innerWidth <= 768; // Or detect by touch
        const zoom = isMobile ? 0.65 : 1.0;

        // Apply scale around the screen center, then apply camera and shake
        this.ctx.translate(this.width / 2, this.height / 2);
        this.ctx.scale(zoom, zoom);
        this.ctx.translate(-this.width / 2 + this.camera.x + sx, -this.height / 2 + this.camera.y + sy);

        // Suelo texturizado
        if (this.floorTexture.complete && this.floorTexture.width > 0) {
            // Crear el patrón solo una vez (o si aún no existe)
            if (!this._floorPattern) {
                // Escalar la textura a 1/5 de su tamaño original antes de crear el patrón
                // para que las baldosas sean mucho más pequeñas en pantalla
                const TILE_SCALE = 1 / 5;
                const offCanvas = document.createElement('canvas');
                offCanvas.width = Math.max(1, Math.round(this.floorTexture.width * TILE_SCALE));
                offCanvas.height = Math.max(1, Math.round(this.floorTexture.height * TILE_SCALE));
                const offCtx = offCanvas.getContext('2d');
                offCtx.imageSmoothingEnabled = false;
                offCtx.drawImage(this.floorTexture, 0, 0, offCanvas.width, offCanvas.height);
                this._floorPattern = this.ctx.createPattern(offCanvas, 'repeat');
            }
            this.ctx.imageSmoothingEnabled = false;
            this.ctx.fillStyle = this._floorPattern;
            // Cubrir todo el mundo jugable (-1500 a 1500 en X e Y)
            this.ctx.fillRect(-1500, -1500, 3000, 3000);
            this.ctx.imageSmoothingEnabled = true;
        } else {
            // Fallback: cuadrícula oscura mientras la textura carga
            this.ctx.strokeStyle = '#2a2a2a';
            this.ctx.beginPath();
            for (let x = -1500; x <= 1500; x += 150) {
                this.ctx.moveTo(x, -1500); this.ctx.lineTo(x, 1500);
            }
            for (let y = -1500; y <= 1500; y += 150) {
                this.ctx.moveTo(-1500, y); this.ctx.lineTo(1500, y);
            }
            this.ctx.stroke();
        }

        for (let p of this.pickups) p.draw(this.ctx);
        for (let e of this.environment) e.draw(this.ctx);
        for (let p of globalParticles) p.draw(this.ctx);
        for (let npc of this.npcs) npc.draw(this.ctx);

        this.player.draw(this.ctx);
        this.ctx.restore();
    }
}
