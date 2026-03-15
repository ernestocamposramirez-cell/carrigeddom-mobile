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

        this.joystick = {
            x: 0,
            y: 0,
            active: false
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
            const knob = document.getElementById('joystick-knob');
            
            const handleJoystick = (e) => {
                e.preventDefault();
                const rect = joystickArea.getBoundingClientRect();
                const centerX = rect.left + rect.width / 2;
                const centerY = rect.top + rect.height / 2;
                
                let dx = e.clientX - centerX;
                let dy = e.clientY - centerY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                const maxDist = rect.width / 2;
                const deadzone = 10;

                if (dist > deadzone) {
                    this.joystick.active = true;
                    // Normalize the vector
                    this.joystick.x = dx / dist;
                    this.joystick.y = dy / dist;
                    
                    // Cap distance to the visual radius if needed for sensitivity
                    const power = Math.min(dist / maxDist, 1.0);
                    this.joystick.x *= power;
                    this.joystick.y *= power;

                    // Move Knob Visually
                    if (knob) {
                        const moveX = this.joystick.x * maxDist;
                        const moveY = this.joystick.y * maxDist;
                        knob.style.transform = `translate(calc(-50% + ${moveX}px), calc(-50% + ${moveY}px))`;
                        knob.style.background = 'rgba(0, 255, 170, 0.6)';
                    }

                    // Visual feedback: Highlight arrows based on major direction
                    const btns = joystickArea.querySelectorAll('.joy-btn');
                    btns.forEach(b => b.classList.remove('active'));
                    
                    if (Math.abs(this.joystick.x) > 0.4) {
                        if (this.joystick.x > 0) document.getElementById('btn-right')?.classList.add('active');
                        else document.getElementById('btn-left')?.classList.add('active');
                    }
                    if (Math.abs(this.joystick.y) > 0.4) {
                        if (this.joystick.y > 0) document.getElementById('btn-down')?.classList.add('active');
                        else document.getElementById('btn-up')?.classList.add('active');
                    }
                } else {
                    this.stopJoystick();
                }
            };

            joystickArea.addEventListener('pointerdown', (e) => handleJoystick(e));
            joystickArea.addEventListener('pointermove', (e) => {
                if (e.buttons > 0 || e.pointerType === 'touch') handleJoystick(e);
            });
            joystickArea.addEventListener('pointerup', (e) => this.stopJoystick(e));
            joystickArea.addEventListener('pointerleave', (e) => this.stopJoystick(e));
            joystickArea.addEventListener('pointercancel', (e) => this.stopJoystick(e));
        }
    }

    stopJoystick(e) {
        if (e) e.preventDefault();
        this.joystick.active = false;
        this.joystick.x = 0;
        this.joystick.y = 0;
        const joystickArea = document.getElementById('joystick-area');
        const knob = document.getElementById('joystick-knob');
        if (knob) {
            knob.style.transform = `translate(-50%, -50%)`;
            knob.style.background = 'rgba(0, 255, 170, 0.3)';
        }
        if (joystickArea) {
            joystickArea.querySelectorAll('.joy-btn').forEach(b => b.classList.remove('active'));
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
