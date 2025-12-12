// Game state
let gameState = {
    players: [
        { 
            x: 100, y: 100, direction: 0, ammo: 5, reloading: false, reloadTime: 0, alive: true,
            powerup: null, powerupTime: 0, powerupActive: false, lastShot: 0
        },
        { 
            x: 700, y: 500, direction: Math.PI, ammo: 5, reloading: false, reloadTime: 0, alive: true,
            powerup: null, powerupTime: 0, powerupActive: false, lastShot: 0
        }
    ],
    bullets: [],
    walls: [],
    powerups: [],
    gameSize: 'medium',
    gameActive: false,
    keys: {},
    canvas: null,
    ctx: null,
    lastTime: 0,
    displayMode: 'windowed',
    scores: [0, 0],
    gameHistory: [],
    maxScore: 3,
    gameStartTime: 0,
    shotCooldown: 300 // 300ms cooldown between shots
};

// Powerup types
const POWERUP_TYPES = {
    SPLIT: { name: 'SPLIT', color: '#9C27B0', duration: 5, icon: '⚡' },
    DOUBLE: { name: 'DOUBLE', color: '#FFC107', duration: 5, icon: '🔫' },
    BIG: { name: 'BIG', color: '#F44336', duration: 5, icon: '💥' },
    PENETRATE: { name: 'PENETRATE', color: '#00BCD4', duration: 5, icon: '🔍' }
};

// Initialize the game
document.addEventListener('DOMContentLoaded', function() {
    // Set up event listeners for menu navigation
    document.getElementById('start-game-btn').addEventListener('click', showSizeSelection);
    
    document.getElementById('records-btn').addEventListener('click', showRecords);
    document.getElementById('leaderboard-btn').addEventListener('click', showLeaderboard);
    document.getElementById('options-btn').addEventListener('click', showOptions);
    document.getElementById('exit-btn').addEventListener('click', exitGame);
    
    // Size selection
    document.querySelectorAll('.size-option').forEach(option => {
        option.addEventListener('click', function() {
            startGame(this.dataset.size);
        });
    });
    
    document.getElementById('back-from-size').addEventListener('click', backToMenu);
    
    // Options
    document.querySelectorAll('input[name="display-mode"]').forEach(radio => {
        radio.addEventListener('change', function() {
            gameState.displayMode = this.value;
            applyDisplayMode();
        });
    });
    
    document.getElementById('back-from-options').addEventListener('click', backToMenu);
    
    // Other navigation
    document.getElementById('back-from-records').addEventListener('click', backToMenu);
    document.getElementById('back-from-leaderboard').addEventListener('click', backToMenu);
    
    document.getElementById('exit-game-btn').addEventListener('click', backToMenu);
    
    document.getElementById('play-again-btn').addEventListener('click', function() {
        startGame(gameState.gameSize);
    });
    
    document.getElementById('back-to-menu-btn').addEventListener('click', backToMenu);
    
    // Set up keyboard controls
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Initialize canvas
    gameState.canvas = document.getElementById('game-canvas');
    gameState.ctx = gameState.canvas.getContext('2d');
    
    // Load game history from backend
    loadGameHistory();
    
    // Set initial display mode
    applyDisplayMode();
});

function applyDisplayMode() {
    if (gameState.displayMode === 'fullscreen') {
        document.body.classList.add('fullscreen');
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        }
    } else {
        document.body.classList.remove('fullscreen');
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
    resizeCanvas();
}

function resizeCanvas() {
    const container = document.getElementById('game-screen');
    let maxWidth, maxHeight;
    
    if (gameState.displayMode === 'fullscreen') {
        maxWidth = window.innerWidth * 0.95;
        maxHeight = window.innerHeight * 0.8;
    } else {
        maxWidth = Math.min(1000, window.innerWidth * 0.9);
        maxHeight = Math.min(600, window.innerHeight * 0.7);
    }
    
    gameState.canvas.width = maxWidth;
    gameState.canvas.height = maxHeight;
}

function showSizeSelection() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('size-selection-screen').classList.remove('hidden');
}

function showOptions() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('options-screen').classList.remove('hidden');
}

function startGame(size) {
    gameState.gameSize = size;
    gameState.gameActive = true;
    gameState.scores = [0, 0];
    gameState.gameStartTime = performance.now();
    
    // Set exact game area based on size
    let width, height;
    switch(size) {
        case 'small':
            width = 800;
            height = 500;
            break;
        case 'large':
            width = 1200;
            height = 700;
            break;
        default: // medium
            width = 1000;
            height = 600;
    }
    
    // Adjust for display mode while maintaining aspect ratio
    if (gameState.displayMode === 'fullscreen') {
        const scale = Math.min(window.innerWidth * 0.9 / width, window.innerHeight * 0.8 / height);
        width = Math.floor(width * scale);
        height = Math.floor(height * scale);
    }
    
    gameState.canvas.width = width;
    gameState.canvas.height = height;
    
    // Reset game state
    gameState.players = [
        { 
            x: 100, y: 100, direction: 0, ammo: 5, reloading: false, reloadTime: 0, alive: true,
            powerup: null, powerupTime: 0, powerupActive: false, lastShot: 0
        },
        { 
            x: width - 100, y: height - 100, direction: Math.PI, ammo: 5, reloading: false, reloadTime: 0, alive: true,
            powerup: null, powerupTime: 0, powerupActive: false, lastShot: 0
        }
    ];
    gameState.bullets = [];
    gameState.walls = [];
    gameState.powerups = [];
    
    // Generate maze-like walls
    generateMazeWalls(width, height);
    
    // Show game screen
    document.getElementById('size-selection-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    
    // Update UI
    updateScoreboard();
    updatePlayerUI();
    
    // Start game loop
    gameState.lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function generateMazeWalls(width, height) {
    // Clear existing walls
    gameState.walls = [];
    
    const gridSize = 50;
    const wallThickness = 5;
    
    // Create border walls
    gameState.walls.push({ x: 0, y: 0, width: width, height: wallThickness, type: 'indestructible', color: '#696969' });
    gameState.walls.push({ x: 0, y: 0, width: wallThickness, height: height, type: 'indestructible', color: '#696969' });
    gameState.walls.push({ x: width - wallThickness, y: 0, width: wallThickness, height: height, type: 'indestructible', color: '#696969' });
    gameState.walls.push({ x: 0, y: height - wallThickness, width: width, height: wallThickness, type: 'indestructible', color: '#696969' });
    
    // Generate maze-like structure
    const cols = Math.floor(width / gridSize);
    const rows = Math.floor(height / gridSize);
    
    // Create grid cells
    const grid = [];
    for (let y = 0; y < rows; y++) {
        grid[y] = [];
        for (let x = 0; x < cols; x++) {
            grid[y][x] = { visited: false, walls: { top: true, right: true, bottom: true, left: true } };
        }
    }
    
    // Depth-first search maze generation
    function carvePassage(x, y) {
        grid[y][x].visited = true;
        
        const directions = [
            { dx: 0, dy: -1, wall: 'top', opposite: 'bottom' },
            { dx: 1, dy: 0, wall: 'right', opposite: 'left' },
            { dx: 0, dy: 1, wall: 'bottom', opposite: 'top' },
            { dx: -1, dy: 0, wall: 'left', opposite: 'right' }
        ];
        
        // Shuffle directions
        for (let i = directions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [directions[i], directions[j]] = [directions[j], directions[i]];
        }
        
        for (const dir of directions) {
            const nx = x + dir.dx;
            const ny = y + dir.dy;
            
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && !grid[ny][nx].visited) {
                grid[y][x].walls[dir.wall] = false;
                grid[ny][nx].walls[dir.opposite] = false;
                carvePassage(nx, ny);
            }
        }
    }
    
    // Start carving from a random position
    const startX = Math.floor(Math.random() * cols);
    const startY = Math.floor(Math.random() * rows);
    carvePassage(startX, startY);
    
    // Create walls from the grid
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cell = grid[y][x];
            const cellX = x * gridSize;
            const cellY = y * gridSize;
            
            if (cell.walls.top && cellY > 0) {
                gameState.walls.push({
                    x: cellX, y: cellY,
                    width: gridSize, height: wallThickness,
                    type: 'indestructible', color: '#696969'
                });
            }
            
            if (cell.walls.left && cellX > 0) {
                gameState.walls.push({
                    x: cellX, y: cellY,
                    width: wallThickness, height: gridSize,
                    type: 'indestructible', color: '#696969'
                });
            }
            
            // Add right and bottom walls for the last cells
            if (x === cols - 1 && cell.walls.right) {
                gameState.walls.push({
                    x: cellX + gridSize - wallThickness, y: cellY,
                    width: wallThickness, height: gridSize,
                    type: 'indestructible', color: '#696969'
                });
            }
            
            if (y === rows - 1 && cell.walls.bottom) {
                gameState.walls.push({
                    x: cellX, y: cellY + gridSize - wallThickness,
                    width: gridSize, height: wallThickness,
                    type: 'indestructible', color: '#696969'
                });
            }
        }
    }
    
    // Remove some walls to create more open paths (maze simplification)
    const wallsToRemove = Math.floor(gameState.walls.length * 0.1); // Remove 10% of walls
    for (let i = 0; i < wallsToRemove; i++) {
        const randomIndex = Math.floor(Math.random() * gameState.walls.length);
        gameState.walls.splice(randomIndex, 1);
    }
    
    // Create 2x2 empty spawn boxes for players
    createSpawnBox(100, 100, gridSize);
    createSpawnBox(width - 100, height - 100, gridSize);
}

function createSpawnBox(centerX, centerY, gridSize) {
    // Clear a 2x2 grid area around the spawn point
    const boxSize = gridSize * 2;
    const startX = centerX - gridSize;
    const startY = centerY - gridSize;
    
    // Remove walls in the 2x2 area
    for (let i = gameState.walls.length - 1; i >= 0; i--) {
        const wall = gameState.walls[i];
        
        // Check if wall is inside the spawn box
        if (wall.x >= startX && wall.x <= startX + boxSize &&
            wall.y >= startY && wall.y <= startY + boxSize) {
            gameState.walls.splice(i, 1);
        }
    }
}

function gameLoop(timestamp) {
    if (!gameState.gameActive) return;
    
    const deltaTime = (timestamp - gameState.lastTime) / 1000;
    gameState.lastTime = timestamp;
    
    updateGame(deltaTime);
    renderGame();
    
    requestAnimationFrame(gameLoop);
}

function updateGame(deltaTime) {
    // Spawn powerups after 5 seconds
    const gameTime = (performance.now() - gameState.gameStartTime) / 1000;
    if (gameTime >= 5 && gameState.powerups.length === 0) {
        spawnPowerup();
    }
    
    // Update player positions based on keys pressed
    for (let i = 0; i < gameState.players.length; i++) {
        if (gameState.players[i].alive) {
            updatePlayer(i, deltaTime);
        }
    }
    
    // Check for powerup collection by tank collision
    for (let i = gameState.powerups.length - 1; i >= 0; i--) {
        const powerup = gameState.powerups[i];
        for (let j = 0; j < gameState.players.length; j++) {
            const player = gameState.players[j];
            if (player.alive && 
                Math.sqrt(Math.pow(powerup.x - player.x, 2) + Math.pow(powerup.y - player.y, 2)) < 25) {
                // Player collected powerup by touching it
                applyPowerup(j, powerup.type);
                gameState.powerups.splice(i, 1);
                break;
            }
        }
    }
    
    // Update bullets with bouncing
    for (let i = gameState.bullets.length - 1; i >= 0; i--) {
        const bullet = gameState.bullets[i];
        
        // Store previous position for collision detection
        const prevX = bullet.x;
        const prevY = bullet.y;
        
        // Move bullet
        bullet.x += Math.cos(bullet.direction) * bullet.speed * deltaTime;
        bullet.y += Math.sin(bullet.direction) * bullet.speed * deltaTime;
        
        // Check for wall collisions with bouncing or penetration
        let hitWall = false;
        for (let j = 0; j < gameState.walls.length; j++) {
            const wall = gameState.walls[j];
            
            if (bullet.x >= wall.x && bullet.x <= wall.x + wall.width &&
                bullet.y >= wall.y && bullet.y <= wall.y + wall.height) {
                
                if (bullet.penetrate) {
                    // Penetrating bullet - pass through walls but reduce penetration count
                    bullet.penetrationCount--;
                    if (bullet.penetrationCount <= 0) {
                        hitWall = true;
                    }
                    // Continue moving through the wall
                } else {
                    // Normal bullet - bounce
                    const normal = calculateCollisionNormal(prevX, prevY, bullet.x, bullet.y, wall);
                    if (normal) {
                        // Reflect bullet direction
                        const dot = bullet.directionX * normal.x + bullet.directionY * normal.y;
                        bullet.directionX -= 2 * dot * normal.x;
                        bullet.directionY -= 2 * dot * normal.y;
                        
                        // Update direction angle
                        bullet.direction = Math.atan2(bullet.directionY, bullet.directionX);
                        
                        // Move bullet slightly away from wall to prevent sticking
                        bullet.x = prevX;
                        bullet.y = prevY;
                        
                        // Reduce bounces remaining
                        bullet.bounces--;
                        
                        if (bullet.bounces <= 0) {
                            hitWall = true;
                        }
                    } else {
                        hitWall = true;
                    }
                }
                break;
            }
        }
        
        // Check for player collisions (including suicide)
        for (let j = 0; j < gameState.players.length; j++) {
            if (gameState.players[j].alive &&
                Math.sqrt(Math.pow(bullet.x - gameState.players[j].x, 2) + 
                         Math.pow(bullet.y - gameState.players[j].y, 2)) < (bullet.size + 15)) {
                
                // Hit player - player dies
                gameState.players[j].alive = false;
                hitWall = true;
                
                // Update score (only if it's not suicide)
                if (j !== bullet.player) {
                    gameState.scores[bullet.player]++;
                } else {
                    // Suicide - point goes to the other player
                    gameState.scores[1 - bullet.player]++;
                }
                
                updateScoreboard();
                
                // Check if game over (first to 3 points)
                const winner = j !== bullet.player ? bullet.player : 1 - bullet.player;
                if (gameState.scores[winner] >= gameState.maxScore) {
                    endGame(winner, j);
                    return;
                } else {
                    // Respawn player after delay
                    setTimeout(() => respawnPlayer(j), 1000);
                }
            }
        }
        
        // Remove bullet if it hits something or goes out of bounds
        if (hitWall || 
            bullet.x < 0 || bullet.x > gameState.canvas.width ||
            bullet.y < 0 || bullet.y > gameState.canvas.height) {
            gameState.bullets.splice(i, 1);
        }
    }
    
    // Update powerups - disappear after 10 seconds
    for (let i = gameState.powerups.length - 1; i >= 0; i--) {
        const powerup = gameState.powerups[i];
        powerup.time -= deltaTime;
        if (powerup.time <= 0) {
            gameState.powerups.splice(i, 1);
        }
    }
    
    // Handle reloading and powerup timers
    for (let i = 0; i < gameState.players.length; i++) {
        const player = gameState.players[i];
        
        if (player.reloading) {
            player.reloadTime -= deltaTime;
            if (player.reloadTime <= 0) {
                player.ammo = 5;
                player.reloading = false;
                updatePlayerUI();
            } else {
                updatePlayerUI();
            }
        }
        
        if (player.powerupActive) {
            player.powerupTime -= deltaTime;
            if (player.powerupTime <= 0) {
                player.powerupActive = false;
                player.powerup = null;
                updatePlayerUI();
            } else {
                updatePlayerUI();
            }
        }
    }
}

function calculateCollisionNormal(prevX, prevY, currX, currY, wall) {
    // Calculate which side of the wall was hit
    const bulletCenterX = (prevX + currX) / 2;
    const bulletCenterY = (prevY + currY) / 2;
    
    const wallCenterX = wall.x + wall.width / 2;
    const wallCenterY = wall.y + wall.height / 2;
    
    const dx = bulletCenterX - wallCenterX;
    const dy = bulletCenterY - wallCenterY;
    
    // Determine which side was hit based on the larger component
    if (Math.abs(dx) > Math.abs(dy)) {
        return { x: Math.sign(dx), y: 0 };
    } else {
        return { x: 0, y: Math.sign(dy) };
    }
}

function updatePlayer(playerIndex, deltaTime) {
    const player = gameState.players[playerIndex];
    if (!player.alive) return;
    
    const speed = 150; // Reduced speed for better control
    let moved = false;
    let newDirection = player.direction;
    
    // Player 1 controls (WASD) - 4-direction movement only
    if (playerIndex === 0) {
        if ((gameState.keys['w'] || gameState.keys['W']) && !(gameState.keys['s'] || gameState.keys['S'])) {
            player.y -= speed * deltaTime;
            newDirection = -Math.PI / 2; // Up
            moved = true;
        }
        if ((gameState.keys['s'] || gameState.keys['S']) && !(gameState.keys['w'] || gameState.keys['W'])) {
            player.y += speed * deltaTime;
            newDirection = Math.PI / 2; // Down
            moved = true;
        }
        if ((gameState.keys['a'] || gameState.keys['A']) && !(gameState.keys['d'] || gameState.keys['D'])) {
            player.x -= speed * deltaTime;
            newDirection = Math.PI; // Left
            moved = true;
        }
        if ((gameState.keys['d'] || gameState.keys['D']) && !(gameState.keys['a'] || gameState.keys['A'])) {
            player.x += speed * deltaTime;
            newDirection = 0; // Right
            moved = true;
        }
    }
    // Player 2 controls (Arrow keys) - 4-direction movement only
    else {
        if (gameState.keys['ArrowUp'] && !gameState.keys['ArrowDown']) {
            player.y -= speed * deltaTime;
            newDirection = -Math.PI / 2; // Up
            moved = true;
        }
        if (gameState.keys['ArrowDown'] && !gameState.keys['ArrowUp']) {
            player.y += speed * deltaTime;
            newDirection = Math.PI / 2; // Down
            moved = true;
        }
        if (gameState.keys['ArrowLeft'] && !gameState.keys['ArrowRight']) {
            player.x -= speed * deltaTime;
            newDirection = Math.PI; // Left
            moved = true;
        }
        if (gameState.keys['ArrowRight'] && !gameState.keys['ArrowLeft']) {
            player.x += speed * deltaTime;
            newDirection = 0; // Right
            moved = true;
        }
    }
    
    // Update direction only if player moved
    if (moved) {
        player.direction = newDirection;
    }
    
    // Keep player within bounds
    player.x = Math.max(20, Math.min(gameState.canvas.width - 20, player.x));
    player.y = Math.max(20, Math.min(gameState.canvas.height - 20, player.y));
    
    // Improved wall collision detection with barrel consideration
    for (const wall of gameState.walls) {
        if (checkCollision(player, wall)) {
            // Calculate overlap in both directions
            const overlapX = Math.min(
                player.x + 15 - wall.x,
                wall.x + wall.width - (player.x - 15)
            );
            const overlapY = Math.min(
                player.y + 12 - wall.y,
                wall.y + wall.height - (player.y - 12)
            );
            
            // Resolve collision based on smaller overlap
            if (overlapX < overlapY) {
                if (player.x < wall.x + wall.width / 2) {
                    player.x = wall.x - 15;
                } else {
                    player.x = wall.x + wall.width + 15;
                }
            } else {
                if (player.y < wall.y + wall.height / 2) {
                    player.y = wall.y - 12;
                } else {
                    player.y = wall.y + wall.height + 12;
                }
            }
        }
        
        // Additional check for barrel collision to prevent shooting through walls
        const barrelLength = player.powerupActive && player.powerup === POWERUP_TYPES.BIG ? 20 : 18;
        const barrelEndX = player.x + Math.cos(player.direction) * (15 + barrelLength);
        const barrelEndY = player.y + Math.sin(player.direction) * (12 + barrelLength);
        
        if (barrelEndX >= wall.x && barrelEndX <= wall.x + wall.width &&
            barrelEndY >= wall.y && barrelEndY <= wall.y + wall.height) {
            // Barrel is inside wall, adjust position
            const dx = barrelEndX - (wall.x + wall.width / 2);
            const dy = barrelEndY - (wall.y + wall.height / 2);
            
            if (Math.abs(dx) > Math.abs(dy)) {
                player.x -= Math.cos(player.direction) * 5;
            } else {
                player.y -= Math.sin(player.direction) * 5;
            }
        }
    }
}

function checkCollision(player, wall) {
    // Tank is now smaller: 30x24 pixels (reduced from 40x30)
    return player.x - 15 < wall.x + wall.width &&
           player.x + 15 > wall.x &&
           player.y - 12 < wall.y + wall.height &&
           player.y + 12 > wall.y;
}

function renderGame() {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    
    // Clear canvas with dark background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid pattern for battlefield
    drawGrid();
    
    // Draw walls
    for (const wall of gameState.walls) {
        ctx.fillStyle = wall.color;
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        
        // Add wall texture
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    }
    
    // Draw powerups
    for (const powerup of gameState.powerups) {
        ctx.save();
        ctx.translate(powerup.x, powerup.y);
        
        // Powerup background
        ctx.fillStyle = powerup.type.color;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        
        // Powerup icon
        ctx.fillStyle = 'white';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(powerup.type.icon, 0, 0);
        
        // Pulsing effect
        const pulse = Math.sin(performance.now() * 0.01) * 2 + 15;
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, pulse, 0, Math.PI * 2);
        ctx.stroke();
        
        // Countdown timer circle
        const progress = powerup.time / 10; // 10 seconds total
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, 18, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();
        
        ctx.restore();
    }
    
    // Draw players (smaller tank design)
    for (let i = 0; i < gameState.players.length; i++) {
        const player = gameState.players[i];
        
        if (!player.alive) continue;
        
        // Draw tank body with gradient
        ctx.save();
        ctx.translate(player.x, player.y);
        ctx.rotate(player.direction);
        
        const tankSize = player.powerupActive && player.powerup === POWERUP_TYPES.BIG ? 1.2 : 1;
        
        // Tank body (main chassis) - smaller size: 30x24
        const gradient = ctx.createLinearGradient(-15 * tankSize, -12 * tankSize, 15 * tankSize, 12 * tankSize);
        if (i === 0) {
            gradient.addColorStop(0, '#4CAF50');
            gradient.addColorStop(1, '#2E7D32');
        } else {
            gradient.addColorStop(0, '#2196F3');
            gradient.addColorStop(1, '#0D47A1');
        }
        
        // Special effects for powerups
        if (player.powerupActive) {
            if (player.powerup === POWERUP_TYPES.SPLIT) {
                ctx.shadowColor = '#9C27B0';
                ctx.shadowBlur = 10;
            } else if (player.powerup === POWERUP_TYPES.DOUBLE) {
                ctx.shadowColor = '#FFC107';
                ctx.shadowBlur = 10;
            } else if (player.powerup === POWERUP_TYPES.BIG) {
                ctx.shadowColor = '#F44336';
                ctx.shadowBlur = 15;
            } else if (player.powerup === POWERUP_TYPES.PENETRATE) {
                ctx.shadowColor = '#00BCD4';
                ctx.shadowBlur = 10;
            }
        }
        
        ctx.fillStyle = gradient;
        ctx.fillRect(-15 * tankSize, -12 * tankSize, 30 * tankSize, 24 * tankSize);
        
        // Tank tracks
        ctx.fillStyle = '#333';
        ctx.fillRect(-16 * tankSize, -14 * tankSize, 32 * tankSize, 4 * tankSize);
        ctx.fillRect(-16 * tankSize, 10 * tankSize, 32 * tankSize, 4 * tankSize);
        
        // Tank turret
        ctx.fillStyle = i === 0 ? '#388E3C' : '#1976D2';
        ctx.fillRect(-6 * tankSize, -6 * tankSize, 12 * tankSize, 12 * tankSize);
        
        // Tank barrel
        ctx.fillStyle = '#212121';
        const barrelLength = player.powerupActive && player.powerup === POWERUP_TYPES.BIG ? 20 : 18;
        ctx.fillRect(6 * tankSize, -2 * tankSize, barrelLength * tankSize, 4 * tankSize);
        
        // Tank details
        ctx.fillStyle = '#555';
        ctx.fillRect(-10 * tankSize, -6 * tankSize, 3 * tankSize, 3 * tankSize);
        ctx.fillRect(3 * tankSize, -6 * tankSize, 3 * tankSize, 3 * tankSize);
        ctx.fillRect(-10 * tankSize, 3 * tankSize, 3 * tankSize, 3 * tankSize);
        ctx.fillRect(3 * tankSize, 3 * tankSize, 3 * tankSize, 3 * tankSize);
        
        ctx.restore();
    }
    
    // Draw bullets with glow effect
    for (const bullet of gameState.bullets) {
        // Bullet core
        ctx.fillStyle = bullet.color || '#FFD700';
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Bullet glow for special bullets
        if (bullet.color !== '#FFD700') {
            const glow = ctx.createRadialGradient(
                bullet.x, bullet.y, 0,
                bullet.x, bullet.y, bullet.size + 3
            );
            glow.addColorStop(0, bullet.color + 'CC');
            glow.addColorStop(1, bullet.color + '00');
            
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, bullet.size + 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Trail effect for bouncing bullets
        if (bullet.bounces < 3 && !bullet.penetrate) {
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(bullet.x, bullet.y);
            ctx.lineTo(
                bullet.x - Math.cos(bullet.direction) * 20,
                bullet.y - Math.sin(bullet.direction) * 20
            );
            ctx.stroke();
        }
    }
}

function drawGrid() {
    const ctx = gameState.ctx;
    const canvas = gameState.canvas;
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    
    // Vertical lines
    for (let x = 0; x < canvas.width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y < canvas.height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function handleKeyDown(e) {
    gameState.keys[e.key] = true;
    
    // Prevent rapid firing by using cooldown
    const currentTime = performance.now();
    
    // Player 1 shoot (Spacebar)
    if (e.key === ' ' && 
        !gameState.players[0].reloading && 
        gameState.players[0].ammo > 0 && 
        gameState.players[0].alive &&
        currentTime - gameState.players[0].lastShot > gameState.shotCooldown) {
        shoot(0);
        gameState.players[0].lastShot = currentTime;
        e.preventDefault();
    }
    
    // Player 2 shoot (Enter)
    if (e.key === 'Enter' && 
        !gameState.players[1].reloading && 
        gameState.players[1].ammo > 0 && 
        gameState.players[1].alive &&
        currentTime - gameState.players[1].lastShot > gameState.shotCooldown) {
        shoot(1);
        gameState.players[1].lastShot = currentTime;
        e.preventDefault();
    }
}

function handleKeyUp(e) {
    gameState.keys[e.key] = false;
}

function shoot(playerIndex) {
    const player = gameState.players[playerIndex];
    
    player.ammo--;
    updatePlayerUI();
    
    const baseBullet = {
        x: player.x + Math.cos(player.direction) * 25,
        y: player.y + Math.sin(player.direction) * 25,
        direction: player.direction,
        directionX: Math.cos(player.direction),
        directionY: Math.sin(player.direction),
        speed: 400,
        player: playerIndex,
        bounces: 3, // Normal bullets bounce 3 times
        size: 4,
        color: '#FFD700',
        penetrate: false,
        penetrationCount: 0
    };
    
    if (player.powerupActive) {
        if (player.powerup === POWERUP_TYPES.SPLIT) {
            // Split bullet - shoot three bullets at different angles
            const angles = [-0.3, 0, 0.3];
            angles.forEach(angle => {
                const splitBullet = { ...baseBullet };
                splitBullet.direction = player.direction + angle;
                splitBullet.directionX = Math.cos(splitBullet.direction);
                splitBullet.directionY = Math.sin(splitBullet.direction);
                splitBullet.color = '#9C27B0';
                gameState.bullets.push(splitBullet);
            });
        } else if (player.powerup === POWERUP_TYPES.DOUBLE) {
            // Double bullet - shoot two bullets
            const doubleBullet1 = { ...baseBullet };
            doubleBullet1.x += Math.cos(player.direction + Math.PI/2) * 8;
            doubleBullet1.y += Math.sin(player.direction + Math.PI/2) * 8;
            doubleBullet1.color = '#FFC107';
            
            const doubleBullet2 = { ...baseBullet };
            doubleBullet2.x += Math.cos(player.direction - Math.PI/2) * 8;
            doubleBullet2.y += Math.sin(player.direction - Math.PI/2) * 8;
            doubleBullet2.color = '#FFC107';
            
            gameState.bullets.push(doubleBullet1, doubleBullet2);
        } else if (player.powerup === POWERUP_TYPES.BIG) {
            // Big bullet
            const bigBullet = { ...baseBullet };
            bigBullet.size = 6;
            bigBullet.speed = 350;
            bigBullet.color = '#F44336';
            gameState.bullets.push(bigBullet);
        } else if (player.powerup === POWERUP_TYPES.PENETRATE) {
            // Penetrating bullet
            const penetrateBullet = { ...baseBullet };
            penetrateBullet.penetrate = true;
            penetrateBullet.penetrationCount = 3; // Can pass through 3 walls
            penetrateBullet.color = '#00BCD4';
            penetrateBullet.bounces = 0; // No bouncing for penetrating bullets
            gameState.bullets.push(penetrateBullet);
        }
    } else {
        // Normal bullet with bouncing
        gameState.bullets.push(baseBullet);
    }
    
    // Start reload if out of ammo
    if (player.ammo <= 0) {
        player.reloading = true;
        player.reloadTime = 2; // 2 seconds
        updatePlayerUI();
    }
}

function spawnPowerup() {
    const canvas = gameState.canvas;
    
    // Get all possible accessible positions in the maze
    const accessiblePositions = findAccessiblePositions();
    
    if (accessiblePositions.length > 0) {
        // Choose a random accessible position
        const randomPos = accessiblePositions[Math.floor(Math.random() * accessiblePositions.length)];
        
        // Choose random powerup type (including the new penetrate powerup)
        const powerupTypes = Object.values(POWERUP_TYPES);
        const randomType = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        
        gameState.powerups.push({
            x: randomPos.x,
            y: randomPos.y,
            type: randomType,
            time: 10 // Powerup lasts 10 seconds before disappearing
        });
    }
}

function findAccessiblePositions() {
    const canvas = gameState.canvas;
    const positions = [];
    const gridSize = 25; // Check every 25 pixels for better coverage
    
    // Check positions throughout the entire map
    for (let x = 40; x < canvas.width - 40; x += gridSize) {
        for (let y = 40; y < canvas.height - 40; y += gridSize) {
            if (isPositionAccessible(x, y)) {
                positions.push({ x, y });
            }
        }
    }
    
    return positions;
}

function isPositionAccessible(x, y) {
    // Check if position is not inside or too close to walls
    for (const wall of gameState.walls) {
        // Create a safe zone around the wall (30 pixels buffer)
        const safeDistance = 30;
        const wallLeft = wall.x - safeDistance;
        const wallRight = wall.x + wall.width + safeDistance;
        const wallTop = wall.y - safeDistance;
        const wallBottom = wall.y + wall.height + safeDistance;
        
        if (x >= wallLeft && x <= wallRight &&
            y >= wallTop && y <= wallBottom) {
            return false;
        }
    }
    
    // Check if position is not in spawn boxes
    const spawnBox1 = { x: 50, y: 50, width: 100, height: 100 };
    const spawnBox2 = { 
        x: gameState.canvas.width - 150, 
        y: gameState.canvas.height - 150, 
        width: 100, 
        height: 100 
    };
    
    if ((x >= spawnBox1.x && x <= spawnBox1.x + spawnBox1.width &&
         y >= spawnBox1.y && y <= spawnBox1.y + spawnBox1.height) ||
        (x >= spawnBox2.x && x <= spawnBox2.x + spawnBox2.width &&
         y >= spawnBox2.y && y <= spawnBox2.y + spawnBox2.height)) {
        return false;
    }
    
    // Check if position is not too close to players
    for (const player of gameState.players) {
        const dist = Math.sqrt(Math.pow(x - player.x, 2) + Math.pow(y - player.y, 2));
        if (dist < 60) { // 60 pixel minimum distance from players
            return false;
        }
    }
    
    // Check if position is within canvas bounds with margin
    if (x < 30 || x > gameState.canvas.width - 30 || 
        y < 30 || y > gameState.canvas.height - 30) {
        return false;
    }
    
    return true;
}

function applyPowerup(playerIndex, powerupType) {
    const player = gameState.players[playerIndex];
    player.powerup = powerupType;
    player.powerupActive = true;
    player.powerupTime = powerupType.duration;
    updatePlayerUI();
}

function respawnPlayer(playerIndex) {
    const canvas = gameState.canvas;
    
    // Respawn in the appropriate spawn box
    if (playerIndex === 0) {
        gameState.players[playerIndex].x = 100;
        gameState.players[playerIndex].y = 100;
    } else {
        gameState.players[playerIndex].x = canvas.width - 100;
        gameState.players[playerIndex].y = canvas.height - 100;
    }
    
    gameState.players[playerIndex].direction = Math.random() * Math.PI * 2;
    gameState.players[playerIndex].alive = true;
    gameState.players[playerIndex].ammo = 5;
    gameState.players[playerIndex].reloading = false;
    updatePlayerUI();
}

function updatePlayerUI() {
    // Update player 1 UI
    const player1Bullets = document.querySelectorAll('.player1 .bullet');
    const player1Reload = document.querySelector('.player1 .reload-indicator');
    const player1Powerup = document.getElementById('player1-powerup');
    
    for (let i = 0; i < player1Bullets.length; i++) {
        player1Bullets[i].classList.toggle('used', i >= gameState.players[0].ammo);
    }
    
    if (gameState.players[0].reloading) {
        player1Reload.classList.remove('hidden');
        player1Reload.textContent = `RELOADING ${Math.ceil(gameState.players[0].reloadTime)}s`;
    } else {
        player1Reload.classList.add('hidden');
    }
    
    if (gameState.players[0].powerupActive) {
        player1Powerup.classList.remove('hidden');
        player1Powerup.textContent = `${gameState.players[0].powerup.icon} ${Math.ceil(gameState.players[0].powerupTime)}s`;
        player1Powerup.className = `powerup-indicator ${gameState.players[0].powerup.name.toLowerCase()}`;
    } else {
        player1Powerup.classList.add('hidden');
    }
    
    // Update player 2 UI
    const player2Bullets = document.querySelectorAll('.player2 .bullet');
    const player2Reload = document.querySelector('.player2 .reload-indicator');
    const player2Powerup = document.getElementById('player2-powerup');
    
    for (let i = 0; i < player2Bullets.length; i++) {
        player2Bullets[i].classList.toggle('used', i >= gameState.players[1].ammo);
    }
    
    if (gameState.players[1].reloading) {
        player2Reload.classList.remove('hidden');
        player2Reload.textContent = `RELOADING ${Math.ceil(gameState.players[1].reloadTime)}s`;
    } else {
        player2Reload.classList.add('hidden');
    }
    
    if (gameState.players[1].powerupActive) {
        player2Powerup.classList.remove('hidden');
        player2Powerup.textContent = `${gameState.players[1].powerup.icon} ${Math.ceil(gameState.players[1].powerupTime)}s`;
        player2Powerup.className = `powerup-indicator ${gameState.players[1].powerup.name.toLowerCase()}`;
    } else {
        player2Powerup.classList.add('hidden');
    }
}

function updateScoreboard() {
    document.querySelector('.player1-score').textContent = gameState.scores[0];
    document.querySelector('.player2-score').textContent = gameState.scores[1];
}

function endGame(winnerIndex, loserIndex) {
    gameState.gameActive = false;
    
    // Record game result
    const gameRecord = {
        player1: 1,
        player2: 2,
        winner: winnerIndex + 1,
        score: `${gameState.scores[0]}-${gameState.scores[1]}`,
        timestamp: new Date().toISOString()
    };
    
    gameState.gameHistory.unshift(gameRecord);
    
    // Keep only last 10 games
    if (gameState.gameHistory.length > 10) {
        gameState.gameHistory = gameState.gameHistory.slice(0, 10);
    }
    
    // Save to backend
    saveGameResult(winnerIndex + 1, loserIndex + 1, `${gameState.scores[0]}-${gameState.scores[1]}`);
    
    // Show game over screen
    document.getElementById('game-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.remove('hidden');
    
    // Set winner message
    document.getElementById('game-result').textContent = `Player ${winnerIndex + 1} Wins!`;
    document.getElementById('winner-message').textContent = 
        `Final Score: ${gameState.scores[0]} - ${gameState.scores[1]}`;
}

function backToMenu() {
    gameState.gameActive = false;
    
    // Hide all screens
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    
    // Show main menu
    document.getElementById('main-menu').classList.remove('hidden');
}

function showRecords() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('records-screen').classList.remove('hidden');
    
    // Fetch records from backend and display
    displayRecords();
}

function showLeaderboard() {
    document.getElementById('main-menu').classList.add('hidden');
    document.getElementById('leaderboard-screen').classList.remove('hidden');
    
    // Fetch leaderboard from backend and display
    displayLeaderboard();
}

function exitGame() {
    if (confirm('Are you sure you want to exit the game?')) {
        window.close();
    }
}

// Backend communication functions
function loadGameHistory() {
    fetch('backend.php?action=get_records')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.games) {
                gameState.gameHistory = data.games;
            }
        })
        .catch(error => {
            console.error('Error loading game history:', error);
        });
}

function saveGameResult(winner, loser, score) {
    const gameData = {
        action: 'save_game',
        winner: winner,
        loser: loser,
        score: score
    };
    
    fetch('backend.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            console.log('Game result saved successfully');
        }
    })
    .catch(error => {
        console.error('Error saving game result:', error);
    });
}

function displayRecords() {
    const recordsList = document.getElementById('records-list');
    
    if (gameState.gameHistory.length === 0) {
        recordsList.innerHTML = '<div class="loading">No games played yet</div>';
        return;
    }
    
    recordsList.innerHTML = '';
    gameState.gameHistory.forEach(record => {
        const recordEl = document.createElement('div');
        recordEl.className = `record-item ${record.winner === 1 ? 'win' : 'lose'}`;
        
        const date = new Date(record.timestamp);
        const timeString = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        
        recordEl.innerHTML = `
            <div>
                <strong>Player ${record.player1} vs Player ${record.player2}</strong><br>
                <small>${timeString}</small>
            </div>
            <div>
                <strong>${record.winner === 1 ? 'Player 1 Won' : 'Player 2 Won'}</strong><br>
                <small>Score: ${record.score}</small>
            </div>
        `;
        recordsList.appendChild(recordEl);
    });
}

function displayLeaderboard() {
    const leaderboardList = document.getElementById('leaderboard-list');
    
    // Calculate leaderboard from game history
    const playerStats = {
        1: { wins: 0, losses: 0 },
        2: { wins: 0, losses: 0 }
    };
    
    gameState.gameHistory.forEach(game => {
        if (game.winner === 1) {
            playerStats[1].wins++;
            playerStats[2].losses++;
        } else {
            playerStats[2].wins++;
            playerStats[1].losses++;
        }
    });
    
    // Convert to array and sort by wins (descending)
    const leaderboard = Object.entries(playerStats)
        .map(([player, stats]) => ({
            player: parseInt(player),
            wins: stats.wins,
            losses: stats.losses
        }))
        .sort((a, b) => b.wins - a.wins);
    
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = '<div class="loading">No games played yet</div>';
        return;
    }
    
    leaderboardList.innerHTML = '';
    leaderboard.forEach((player, index) => {
        const playerEl = document.createElement('div');
        playerEl.className = 'leaderboard-item';
        playerEl.innerHTML = `
            <div>
                <strong>#${index + 1} Player ${player.player}</strong>
            </div>
            <div>
                Wins: ${player.wins} | Losses: ${player.losses}
            </div>
        `;
        leaderboardList.appendChild(playerEl);
    });
}

// Handle window resize
window.addEventListener('resize', function() {
    if (gameState.gameActive) {
        resizeCanvas();
    }
});