// ==========================================
// npc.js - Customers in the supermarket
// ==========================================

class Customer extends PhysicsBody {
    constructor(x, y) {
        // --- ESCALA AJUSTADA ---
        // Aumentamos de 20x20 a 50x50 para que sean proporcionales al carro
        // Subimos un poco la masa (8) para que el impacto se sienta sólido
        super(x, y, 50, 50, 8);
        this.restitution = 0.3;

        // AI State
        this.state = 'WANDER'; // WANDER, PANIC, DEAD
        this.speed = 0.15;
        this.targetAngle = randomRange(0, Math.PI * 2);
        this.turnSpeed = 0.05;

        // Timers
        this.wanderTimer = randomRange(60, 180);
        this.panicTimer = 0;

        // Colors (fallback procedural)
        let colors = ['#00ff00', '#0000ff', '#ff00ff', '#ffff00'];
        this.shirtColor = colors[Math.floor(Math.random() * colors.length)];

        // --- Identidad visual ---
        // typeIndex (0-5) determina cuál de los 6 spritesheets usa este peatón
        this.typeIndex = Math.floor(Math.random() * 6);

        // Temporizador de animación de caminar (en ms)
        this._walkTimer = 0;
        this._walkFrame = 0; // alterna entre 0 y 1

        // Temporizador para evitar spam de sonido al pasar por encima
        this.stepoverCooldown = 0;

        // Temporizador para que los cadáveres desaparezcan gradualmente y liberen espacio
        this.deadTimer = 0;
    }

    updateNPC(dt, player) {
        if (this.stepoverCooldown > 0) this.stepoverCooldown -= dt;

        if (this.state === 'DEAD') {
            this.deadTimer += dt;
            this.update(dt);
            return;
        }

        // Acumular tiempo para la animación de caminar (200 ms por frame)
        this._walkTimer += dt;
        if (this._walkTimer >= 200) {
            this._walkFrame = this._walkFrame === 0 ? 1 : 0;
            this._walkTimer = 0;
        }

        this.think(player);
        this.move();
        this.update(dt); // Apply physics
    }

    think(player) {
        let distTemp = player.position.sub(this.position);
        let distToPlayerSq = distTemp.magSq();

        let isScary = player.hasChainsaws || player.velocity.magSq() > 25;

        // Rango de pánico: detectan el carro grande antes
        if (isScary && distToPlayerSq < 250 * 250) {
            if (this.state !== 'PANIC') {
                if (window.audioManager) audioManager.playPanic();
            }
            this.state = 'PANIC';
            this.panicTimer = 120;
            this.targetAngle = Math.atan2(-distTemp.y, -distTemp.x);
        } else {
            if (this.panicTimer > 0) {
                this.panicTimer--;
            } else {
                this.state = 'WANDER';
            }
        }

        if (this.state === 'WANDER') {
            this.wanderTimer--;
            if (this.wanderTimer <= 0) {
                this.targetAngle = randomRange(0, Math.PI * 2);
                this.wanderTimer = randomRange(60, 180);
            }
        }
    }

    move() {
        this.angle += (this.targetAngle - this.angle) * this.turnSpeed;

        let moveSpeed = this.state === 'PANIC' ? this.speed * 2.5 : this.speed;
        let force = new Vector2(Math.cos(this.angle), Math.sin(this.angle));
        force = force.mult(moveSpeed * this.mass);

        this.applyForce(force);
    }

    hit(magnitude, isChainsaw) {
        if (this.state === 'DEAD') return;

        if (isChainsaw || magnitude > 5) {
            if (window.audioManager) audioManager.playHit();
            this.die();
            return 50;
        } else if (magnitude > 2) {
            if (window.audioManager) audioManager.playHit();
            if (this.state !== 'PANIC') {
                if (window.audioManager) audioManager.playPanic();
            }
            this.state = 'PANIC';
            this.panicTimer = 60;
            return 10;
        }
        return 0;
    }

    die() {
        this.state = 'DEAD';
        this.friction = 0.8;
        if (typeof spawnSparks === 'function') spawnSparks(this.position.x, this.position.y, true);
        if (typeof spawnDebris === 'function') spawnDebris(this.position.x, this.position.y);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        // Rotar el sprite en la dirección de movimiento del peatón
        ctx.rotate(this.angle - Math.PI / 2);

        // Desvanecer suavemente el cadáver antes de desaparecer
        if (this.state === 'DEAD' && this.deadTimer > 10000) {
            const fade = Math.max(0, 1 - (this.deadTimer - 10000) / 4000);
            ctx.globalAlpha = fade;
        }

        ctx.imageSmoothingEnabled = false;

        // --- Selección de spritesheet y frame ---
        const sprites = window.game && window.game.pedestrianSprites;
        const img     = sprites && sprites[this.typeIndex];

        if (img && img.complete && img.width > 0) {
            // Cada hoja tiene 4 frames dispuestos en horizontal:
            // [walk-A (0) | walk-B (1) | panic (2) | dead (3)]
            const frameCount  = 4;
            const frameWidth  = img.width / frameCount;
            const frameHeight = img.height;

            // Seleccionar frame según estado
            let frameIndex;
            let shouldFlip = false;
            if (this.state === 'DEAD') {
                frameIndex = 3;                  // último frame: muerto
            } else if (this.state === 'PANIC') {
                frameIndex = 2;                  // tercer frame: brazos arriba
                // Efecto espejo dinámico cada 120ms para animar el pánico
                shouldFlip = Math.floor(Date.now() / 120) % 2 === 0;
            } else {
                frameIndex = this._walkFrame;    // 0 o 1: ciclo de caminar
            }

            // Tamaño en pantalla (mantiene la proporción del frame)
            const drawW = this.width * 2;  // 2× el hitbox para mayor visibilidad
            const drawH = drawW * (frameHeight / frameWidth);

            // Aplicar espejo si estamos en pánico y toca según el timer
            if (shouldFlip) {
                ctx.save();
                ctx.scale(-1, 1);
            }

            ctx.drawImage(
                img,
                frameIndex * frameWidth, 0,  // origen del recorte en la hoja
                frameWidth, frameHeight,      // tamaño del recorte
                -drawW / 2, -drawH / 2,       // centrado en la posición del peatón
                drawW, drawH                  // tamaño final en pantalla
            );

            if (shouldFlip) {
                ctx.restore();
            }

        } else {
            // --- Fallback procedural (mientras los sprites no estén listos) ---
            if (this.state === 'DEAD') {
                ctx.fillStyle = '#880000';
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
            } else {
                // Cuerpo
                ctx.fillStyle = this.shirtColor;
                ctx.fillRect(-this.width / 2, -this.height / 4, this.width, this.height / 2);
                // Cabeza
                ctx.fillStyle = '#ffcc99';
                ctx.beginPath();
                ctx.arc(0, 0, 15, 0, Math.PI * 2);
                ctx.fill();
                // Indicador de pánico
                if (this.state === 'PANIC') {
                    ctx.fillStyle = '#ff0000';
                    ctx.font = '20px "Press Start 2P"';
                    ctx.fillText('!', 10, -20);
                }
            }
        }

        ctx.restore();
    }
}
