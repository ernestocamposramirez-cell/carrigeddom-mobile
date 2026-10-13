// ==========================================
// main.js - Entry point and Game Loop Execution
// ==========================================

// Eliminamos "let game" y usamos window.game directamente para que sea global
window.game = null; 
let lastTime = 0;

function showPowerupMessage(text) {
    const el = document.getElementById('powerup-display');
    if (el) {
        el.innerText = text;
        el.style.display = 'block';
    }
}

function gameLoop(timestamp) {
    // Calculate Delta Time
    let dt = timestamp - lastTime;
    lastTime = timestamp;
    
    // Cap dt (if tab was inactive)
    if (dt > 100) dt = 16; 

    // Update and Draw
    if (window.game) {
        window.game.update(dt);
        window.game.draw();
    }

    requestAnimationFrame(gameLoop);
}

// Ensure resize is handled
window.addEventListener('resize', () => {
    if (window.game) {
        window.game.width = window.innerWidth;
        window.game.height = window.innerHeight;
        window.game.canvas.width = window.game.width;
        window.game.canvas.height = window.game.height;
    }
});

// Run
window.onload = () => {
    // Inicializamos el juego en el objeto global window
    window.game = new Game('gameCanvas');
    requestAnimationFrame(gameLoop);
};
