// ==========================================
// input.js - Handles keyboard input
// ==========================================

class InputHandler {
    constructor() {
        this.keys = {
            ArrowUp: false,
            ArrowDown: false,
            ArrowLeft: false,
            ArrowRight: false,
            Space: false,
            AltLeft: false,
            AltRight: false
        };

        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Initialize HUD controls if they exist
        this.initMobileHUD();
    }

    initMobileHUD() {
        const joystickArea = document.getElementById('joystick-area');
        const handbrakeBtn = document.getElementById('handbrake-btn');

        if (handbrakeBtn) {
            const press = (e) => { e.preventDefault(); this.keys.Space = true; };
            const release = (e) => { e.preventDefault(); this.keys.Space = false; };
            handbrakeBtn.addEventListener('pointerdown', press);
            handbrakeBtn.addEventListener('pointerup', release);
            handbrakeBtn.addEventListener('pointerleave', release);
            handbrakeBtn.addEventListener('pointercancel', release);
        }

        if (joystickArea) {
            const handleJoystick = (e) => {
                e.preventDefault();
                const rect = joystickArea.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                const dx = e.clientX - centerX;
                const dy = e.clientY - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                const deadzone = 15;
                const activeZone = 10; // Threshold to register movement

                // Reset directional keys before updating
                this.keys.ArrowUp = false;
                this.keys.ArrowDown = false;
                this.keys.ArrowLeft = false;
                this.keys.ArrowRight = false;

                // Visual reset
                const btns = joystickArea.querySelectorAll('.joy-btn');
                btns.forEach(b => b.classList.remove('active'));

                if (dist > deadzone) {
                    // Check horizontal (Left/Right)
                    if (dx > activeZone) {
                        this.keys.ArrowRight = true;
                        document.getElementById('btn-right')?.classList.add('active');
                    }
                    if (dx < -activeZone) {
                        this.keys.ArrowLeft = true;
                        document.getElementById('btn-left')?.classList.add('active');
                    }
                    
                    // Check vertical (Up/Down)
                    if (dy > activeZone) {
                        this.keys.ArrowDown = true;
                        document.getElementById('btn-down')?.classList.add('active');
                    }
                    if (dy < -activeZone) {
                        this.keys.ArrowUp = true;
                        document.getElementById('btn-up')?.classList.add('active');
                    }
                }
            };

            const stopJoystick = (e) => {
                e.preventDefault();
                this.keys.ArrowUp = false;
                this.keys.ArrowDown = false;
                this.keys.ArrowLeft = false;
                this.keys.ArrowRight = false;
                joystickArea.querySelectorAll('.joy-btn').forEach(b => b.classList.remove('active'));
            };

            joystickArea.addEventListener('pointerdown', handleJoystick);
            joystickArea.addEventListener('pointermove', (e) => {
                // Only process moves if the pointer is "active" (optional safety)
                if (e.buttons > 0) handleJoystick(e);
            });
            joystickArea.addEventListener('pointerup', stopJoystick);
            joystickArea.addEventListener('pointerleave', stopJoystick);
            joystickArea.addEventListener('pointercancel', stopJoystick);
        }
    }

    handleKeyDown(e) {
        if (this.keys.hasOwnProperty(e.code)) {
            this.keys[e.code] = true;
        }
    }

    handleKeyUp(e) {
        if (this.keys.hasOwnProperty(e.code)) {
            this.keys[e.code] = false;
        }
    }
}

// Global instance to be accessed by the game loop
const input = new InputHandler();
