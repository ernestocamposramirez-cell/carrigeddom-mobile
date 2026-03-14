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

        // Touch/Pointer state
        this.touchStartX = 0;
        this.isPointerDown = false;
        this.steeringThreshold = 20; // px

        window.addEventListener('keydown', (e) => this.handleKeyDown(e));
        window.addEventListener('keyup', (e) => this.handleKeyUp(e));

        // Pointer Events for Mobile/Mouse
        window.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
        window.addEventListener('pointermove', (e) => this.handlePointerMove(e));
        window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
        window.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
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

    handlePointerDown(e) {
        this.isPointerDown = true;
        this.touchStartX = e.clientX;
        this.keys.ArrowUp = true; // Auto-accelerate on touch
    }

    handlePointerMove(e) {
        if (!this.isPointerDown) return;

        const deltaX = e.clientX - this.touchStartX;

        // Dynamic Steering
        if (deltaX > this.steeringThreshold) {
            this.keys.ArrowRight = true;
            this.keys.ArrowLeft = false;
        } else if (deltaX < -this.steeringThreshold) {
            this.keys.ArrowLeft = true;
            this.keys.ArrowRight = false;
        } else {
            this.keys.ArrowLeft = false;
            this.keys.ArrowRight = false;
        }
    }

    handlePointerUp(e) {
        this.isPointerDown = false;
        this.keys.ArrowUp = false;
        this.keys.ArrowLeft = false;
        this.keys.ArrowRight = false;

        // Brief braking for natural feel
        this.keys.ArrowDown = true;
        setTimeout(() => {
            // Only release ArrowDown if pointer is still up
            if (!this.isPointerDown) {
                this.keys.ArrowDown = false;
            }
        }, 200);
    }
}

// Global instance to be accessed by the game loop
const input = new InputHandler();
