// ==========================================
// player.js - Cart Entity and Controller
// ==========================================

class Cart extends PhysicsBody {
    constructor(x, y) {
        // --- DIMENSIONES FÍSICAS (Se mantienen igual para no romper colisiones) ---
        super(x, y, 80, 120, 15);
        this.angle = -Math.PI / 2; 
        this.restitution = 0.6;    
        
        this.baseSpeed = 1.1; 
        this.baseMaxSpeed = 9.5; 
        this.baseTurnSpeed = 0.04; 
        this.drag = 0.96; 
        
        this.speed = this.baseSpeed;
        this.maxSpeed = this.baseMaxSpeed;
        this.turnSpeed = this.baseTurnSpeed;
        this.friction = this.drag;

        this.hasNitro = false;
        this.hasAnchor = false;
        this.hasChainsaws = false;
        this.hasSuperBounce = false;
        this.hasLaser = false;

        this.powerupTimers = {
            nitro: 0,
            chainsaws: 0,
            superBounce: 0,
            laser: 0,
            anchor: 0
        };
    }

    updateCart(dt, inputMap) {
        this.handlePowerups(dt);
        this.handleInput(inputMap);
        this.update(dt); 
    }

    handleInput(inputMap) {
        if (isNaN(this.velocity.x) || isNaN(this.velocity.y)) {
            this.velocity = new Vector2(0, 0);
        }

        let targetDX = 0;
        let targetDY = 0;
        let moving = false;

        // 1. Get Target Direction (Absolute)
        if (inputMap.joystick && inputMap.joystick.active) {
            targetDX = inputMap.joystick.x;
            targetDY = inputMap.joystick.y;
            moving = true;
        } else {
            // Keyboard Absolute Mapping
            if (inputMap.ArrowUp) targetDY -= 1;
            if (inputMap.ArrowDown) targetDY += 1;
            if (inputMap.ArrowLeft) targetDX -= 1;
            if (inputMap.ArrowRight) targetDX += 1;
            
            if (targetDX !== 0 || targetDY !== 0) {
                moving = true;
                // Normalize keyboard diagonal
                const mag = Math.sqrt(targetDX * targetDX + targetDY * targetDY);
                targetDX /= mag;
                targetDY /= mag;
            }
        }

        // 2. Process Movement and Rotation
        if (moving) {
            const targetAngle = Math.atan2(targetDY, targetDX);
            
            // Smoothly interpolate angle
            const angleDiff = Math.atan2(Math.sin(targetAngle - this.angle), Math.cos(targetAngle - this.angle));
            
            // Turning is faster when braking or at lower speeds for maneuverability
            let rotSpeed = 0.15; 
            if (inputMap.Space) rotSpeed = 0.3; // "Handbrake" drift turn
            
            this.angle += angleDiff * rotSpeed;

            // Apply force in the target absolute direction
            let force = new Vector2(targetDX, targetDY);
            force = force.mult(this.speed * this.mass);
            this.applyForce(force);
        }

        // 3. Handbrake / Friction Logic
        if (inputMap.Space) {
            this.velocity = this.velocity.mult(0.92); // Drag
            if (this.velocity.magSq() > 5) {
                spawnSmoke(this.position.x, this.position.y);
            }
        }

        // Speed Limit
        if (this.velocity.magSq() > this.maxSpeed * this.maxSpeed) {
            this.velocity = this.velocity.limit(this.maxSpeed);
        }
    }

    handlePowerups(dt) {
        const p = this.powerupTimers;
        
        // NITRO logic
        if (p.nitro > 0) {
            p.nitro -= 1;
            this.maxSpeed = this.baseMaxSpeed * 1.8; 
            this.speed = this.baseSpeed * 2.3;
        } else {
            this.hasNitro = false;
            this.maxSpeed = this.baseMaxSpeed;
            this.speed = this.baseSpeed;
        }

        // SUPER BOUNCE logic
        if (p.superBounce > 0) {
            p.superBounce -= 1;
            this.restitution = 1.3;
        } else {
            this.hasSuperBounce = false;
            this.restitution = 0.6;
        }

        // CHAINSAWS logic
        if (p.chainsaws > 0) {
            p.chainsaws -= 1;
            this.hasChainsaws = true;
            // Mantener el loop de motosierra mientras esté activo
            if (window.audioManager) audioManager.startChainsaw();
        } else {
            if (this.hasChainsaws) {
                // Acaba de expirar: parar el sonido
                if (window.audioManager) audioManager.stopChainsaw();
            }
            this.hasChainsaws = false;
        }

        if (p.laser > 0) p.laser -= 1; else this.hasLaser = false;
        if (p.anchor > 0) p.anchor -= 1; else this.hasAnchor = false;
    }

    activatePowerup(type) {
        const DURATION = 60 * 10;
        switch(type) {
            case 'NITRO':
                this.hasNitro = true;
                this.powerupTimers.nitro = DURATION;
                // Sonido real de nitro (disparo único)
                if (window.audioManager) audioManager.playNitro();
                break;
            case 'ANCHOR':
                this.hasAnchor = true;
                this.powerupTimers.anchor = DURATION;
                if (window.audioManager) audioManager.playSound('pickup');
                break;
            case 'CHAINSAWS':
                this.hasChainsaws = true;
                this.powerupTimers.chainsaws = DURATION;
                // El loop de motosierra arranca aquí (y handlePowerups lo mantiene)
                // Además disparamos la risa una sola vez
                if (window.audioManager) {
                    audioManager.startChainsaw();
                    audioManager.playChainsawLaugh();
                }
                break;
            case 'SUPER_BOUNCE':
                this.hasSuperBounce = true;
                this.powerupTimers.superBounce = DURATION;
                if (window.audioManager) audioManager.playSound('pickup');
                break;
            case 'LASER':
                this.hasLaser = true;
                this.powerupTimers.laser = DURATION;
                if (window.audioManager) audioManager.playSound('pickup');
                break;
        }
        showPowerupMessage(type + ' ACTIVE!');
    }

    draw(ctx) {
        if (isNaN(this.position.x) || isNaN(this.position.y)) return;

        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        // Rotación para alinear sprite
        ctx.rotate(this.angle + Math.PI / 2 + Math.PI);

        // --- LÓGICA DE SELECCIÓN DE SPRITE ---
        // Prioridad visual: Chainsaw+Nitro > Chainsaw > Nitro > Normal
        let img = window.game ? window.game.playerSpritesheet : null;
        let isChainsawActive = false;

        if (this.hasChainsaws && this.hasNitro && window.game && window.game.chainsawNitroSpritesheet) {
            // Estado combinado — máxima prioridad
            img = window.game.chainsawNitroSpritesheet;
            isChainsawActive = true; // hereda el ancho mayor y vibración fuerte
        } else if (this.hasChainsaws && window.game && window.game.chainsawSpritesheet) {
            img = window.game.chainsawSpritesheet;
            isChainsawActive = true;
        } else if (this.hasNitro && window.game && window.game.nitroSpritesheet) {
            img = window.game.nitroSpritesheet;
        }

        if (img && img.complete && img.width > 0) {
            // --- REESCALADO DINÁMICO ---
            // Si tiene motosierras, usamos un ancho mayor (110px). Si no, el normal (88px).
            const targetWidth = isChainsawActive ? 110 : 80; 
            const ratio = img.height / img.width;
            const targetHeight = targetWidth * ratio;

            ctx.imageSmoothingEnabled = false;

            // --- EFECTOS DE VIBRACIÓN ---
            if (this.hasChainsaws) {
                // Vibración fuerte (motosierras)
                ctx.translate((Math.random()-0.5)*6, (Math.random()-0.5)*6);
            } else if (this.hasNitro) {
                // Vibración ligera (nitro)
                ctx.translate((Math.random()-0.5)*3, (Math.random()-0.5)*3);
            }

            ctx.drawImage(
                img,
                -targetWidth / 2, -targetHeight / 2,
                targetWidth, targetHeight
            );

            ctx.imageSmoothingEnabled = true;

            // Aura para Super Bounce (se dibuja encima del sprite que toque)
            if (this.hasSuperBounce) {
                ctx.globalAlpha = 0.3;
                ctx.fillStyle = '#00ffff';
                ctx.beginPath();
                ctx.arc(0, 0, targetWidth / 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1.0;
            }

        } else {
            this.drawFallback(ctx);
        }
        ctx.restore();
    }

    drawFallback(ctx) {
        // Estado combinado → naranja intenso; chainsaw → rojo; nitro → amarillo; normal → gris
        let color = '#ccc';
        if (this.hasChainsaws && this.hasNitro) color = '#ff6600';
        else if (this.hasChainsaws) color = '#f00';
        else if (this.hasNitro) color = '#ff0';
        ctx.fillStyle = color;
        ctx.fillRect(-40, -60, 80, 120);
    }
}
