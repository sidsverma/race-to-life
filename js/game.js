class Game {
    constructor() {
        try {
            // Get DOM elements
            this.canvas = document.getElementById('gameCanvas');
            this.ctx = this.canvas.getContext('2d');
            this.menu = document.getElementById('menu');
            this.startButton = document.getElementById('startButton');
            this.energyDisplay = document.getElementById('energy');
            this.levelDisplay = document.getElementById('level');
            this.highScoreDisplay = document.getElementById('highScore');
            this.currentScoreDisplay = document.getElementById('currentScore');
            this.scoreList = document.getElementById('scoreList');

            // Verify all required elements are present
            if (!this.canvas || !this.ctx || !this.menu || !this.startButton || 
                !this.energyDisplay || !this.levelDisplay || !this.highScoreDisplay || 
                !this.currentScoreDisplay || !this.scoreList) {
                throw new Error('Required DOM elements not found');
            }

            // Set canvas size
            this.canvas.width = 800;
            this.canvas.height = 600;

            // Game state
            this.isRunning = false;
            this.energy = 100;
            this.level = 1;
            this.currentScore = 0;
            this.highScores = this.loadHighScores();
            
            // Update high score display
            this.updateHighScoreDisplay();
            
            // Player (sperm) properties
            this.player = {
                x: 50,
                y: this.canvas.height / 2,
                radius: 8,
                speed: 5,
                dx: 0,
                dy: 0,
                tail: [],  // Store tail positions for trail effect
                powerups: {
                    speedBoost: 0,    // Duration of speed boost
                    shield: 0         // Duration of shield protection
                }
            };

            // Obstacles
            this.obstacles = [];
            
            // Competitor sperms
            this.competitors = [];
            
            // Energy boosts
            this.energyBoosts = [];
            
            // Goal (egg)
            this.goal = {
                x: this.canvas.width - 50,
                y: this.canvas.height / 2,
                radius: 30,
                reached: false  // Add this to track if egg is reached
            };

            // Power-up types
            this.powerupTypes = ['speed', 'shield'];
            
            // Power-ups
            this.powerups = [];

            // Event listeners
            this.startButton.addEventListener('click', () => this.startGame());
            window.addEventListener('keydown', (e) => this.handleKeyDown(e));
            window.addEventListener('keyup', (e) => this.handleKeyUp(e));

            // Initial setup
            this.setupLevel();
        } catch (error) {
            console.error('Error initializing game:', error);
            alert('Error initializing game. Please check the console for details.');
        }
    }

    startGame() {
        try {
            this.isRunning = true;
            this.menu.style.display = 'none';
            this.gameLoop();
        } catch (error) {
            console.error('Error starting game:', error);
            alert('Error starting game. Please check the console for details.');
        }
    }

    setupLevel() {
        // Clear arrays
        this.obstacles = [];
        this.competitors = [];
        this.energyBoosts = [];
        this.powerups = [];

        // Add obstacles based on level
        for (let i = 0; i < this.level * 3; i++) {
            this.obstacles.push({
                x: Math.random() * (this.canvas.width - 300) + 250, // Start obstacles further right
                y: Math.random() * this.canvas.height,
                radius: Math.random() * 20 + 10
            });
        }

        // Add competitor sperms - all starting from left side
        for (let i = 0; i < this.level * 2; i++) {
            this.competitors.push({
                x: 50,  // Start from left
                y: Math.random() * this.canvas.height,
                radius: 6,
                speed: Math.random() * 1 + 1,  // Slower speed: 1-2 instead of 2-4
                angle: Math.random() * Math.PI/2 - Math.PI/4,  // Angle towards right side
                distanceToGoal: 0,  // Track distance to goal
                tail: []  // Add tail for competitors too
            });
        }

        // Add energy boosts
        for (let i = 0; i < 3; i++) {
            this.energyBoosts.push({
                x: Math.random() * (this.canvas.width - 300) + 250,
                y: Math.random() * this.canvas.height,
                radius: 8,
                collected: false
            });
        }

        // Add power-ups
        for (let i = 0; i < 2; i++) {
            this.powerups.push({
                x: Math.random() * (this.canvas.width - 300) + 250,
                y: Math.random() * this.canvas.height,
                radius: 10,
                type: this.powerupTypes[Math.floor(Math.random() * this.powerupTypes.length)],
                collected: false
            });
        }
    }

    handleKeyDown(e) {
        const speed = this.player.speed;
        switch(e.key) {
            case 'ArrowUp':
            case 'w':
                this.player.dy = -speed;
                break;
            case 'ArrowDown':
            case 's':
                this.player.dy = speed;
                break;
            case 'ArrowLeft':
            case 'a':
                this.player.dx = -speed;
                break;
            case 'ArrowRight':
            case 'd':
                this.player.dx = speed;
                break;
        }
    }

    handleKeyUp(e) {
        switch(e.key) {
            case 'ArrowUp':
            case 'ArrowDown':
            case 'w':
            case 's':
                this.player.dy = 0;
                break;
            case 'ArrowLeft':
            case 'ArrowRight':
            case 'a':
            case 'd':
                this.player.dx = 0;
                break;
        }
    }

    update() {
        if (!this.isRunning) return;

        // Update current score based on level and energy
        this.currentScore = Math.floor(this.level * 1000 + this.energy * 10);
        
        // Update current score display
        this.currentScoreDisplay.textContent = this.currentScore;

        // Update player position with potential speed boost
        const currentSpeed = this.player.powerups.speedBoost > 0 ? this.player.speed * 1.5 : this.player.speed;
        this.player.x += this.player.dx * (currentSpeed / this.player.speed);
        this.player.y += this.player.dy * (currentSpeed / this.player.speed);

        // Update power-up durations
        if (this.player.powerups.speedBoost > 0) this.player.powerups.speedBoost--;
        if (this.player.powerups.shield > 0) this.player.powerups.shield--;

        // Add current position to tail
        this.player.tail.unshift({ x: this.player.x, y: this.player.y });
        if (this.player.tail.length > 10) this.player.tail.pop();

        // Keep player in bounds
        this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
        this.player.y = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, this.player.y));

        // Update competitors and check if they reach the egg
        this.competitors.forEach(comp => {
            // Update competitor position
            comp.x += Math.cos(comp.angle) * comp.speed;
            comp.y += Math.sin(comp.angle) * comp.speed;

            // Add position to competitor's tail
            if (!comp.tail) comp.tail = [];
            comp.tail.unshift({ x: comp.x, y: comp.y });
            if (comp.tail.length > 5) comp.tail.pop();

            // Make competitors more goal-oriented
            if (Math.random() < 0.05) {
                const dx = this.goal.x - comp.x;
                const dy = this.goal.y - comp.y;
                const angleToGoal = Math.atan2(dy, dx);
                const angleAdjustment = 0.3; // Reduced from 0.5 for less aggressive turning
                comp.angle = comp.angle * (1 - angleAdjustment) + angleToGoal * angleAdjustment;
            }

            // Keep in bounds
            if (comp.x < 0 || comp.x > this.canvas.width) comp.angle = Math.PI - comp.angle;
            if (comp.y < 0 || comp.y > this.canvas.height) comp.angle = -comp.angle;

            // Update distance to goal for visual indicator
            const dx = this.goal.x - comp.x;
            const dy = this.goal.y - comp.y;
            comp.distanceToGoal = Math.sqrt(dx * dx + dy * dy);

            // Check if competitor reaches the egg
            if (comp.distanceToGoal < comp.radius + this.goal.radius && !this.goal.reached) {
                this.goal.reached = true;
                this.loseGame("Another cell reached the goal first!");
            }
        });

        // Check collisions
        this.checkCollisions();

        // Decrease energy over time
        this.energy -= 0.1;
        if (this.energy <= 0) {
            this.loseGame("You ran out of energy!");
        }

        // Update energy display
        this.energyDisplay.textContent = Math.round(this.energy);
    }

    checkCollisions() {
        // Check obstacle collisions
        this.obstacles.forEach(obstacle => {
            const dx = this.player.x - obstacle.x;
            const dy = this.player.y - obstacle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.player.radius + obstacle.radius) {
                // Only take damage if no shield
                if (this.player.powerups.shield <= 0) {
                    this.energy -= 10;
                    // Bounce effect
                    this.player.x -= this.player.dx * 2;
                    this.player.y -= this.player.dy * 2;
                }
            }
        });

        // Check power-up collisions
        this.powerups.forEach(powerup => {
            if (!powerup.collected) {
                const dx = this.player.x - powerup.x;
                const dy = this.player.y - powerup.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.player.radius + powerup.radius) {
                    powerup.collected = true;
                    if (powerup.type === 'speed') {
                        // Add 5 seconds (300 frames at 60fps) to existing duration
                        this.player.powerups.speedBoost = Math.max(300, this.player.powerups.speedBoost + 300);
                    } else if (powerup.type === 'shield') {
                        // Add 5 seconds (300 frames at 60fps) to existing duration
                        this.player.powerups.shield = Math.max(300, this.player.powerups.shield + 300);
                    }
                }
            }
        });

        // Check energy boost collisions
        this.energyBoosts.forEach(boost => {
            if (!boost.collected) {
                const dx = this.player.x - boost.x;
                const dy = this.player.y - boost.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance < this.player.radius + boost.radius) {
                    boost.collected = true;
                    this.energy = Math.min(100, this.energy + 30);
                }
            }
        });

        // Check goal collision
        const dx = this.player.x - this.goal.x;
        const dy = this.player.y - this.goal.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < this.player.radius + this.goal.radius) {
            this.levelComplete();
        }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#0f3460';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw tail (trail effect)
        this.ctx.beginPath();
        this.ctx.moveTo(this.player.tail[0]?.x, this.player.tail[0]?.y);
        this.player.tail.forEach((pos, i) => {
            this.ctx.lineTo(pos.x, pos.y);
        });
        this.ctx.strokeStyle = 'rgba(233, 69, 96, 0.5)';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        // Draw obstacles
        this.obstacles.forEach(obstacle => {
            this.ctx.beginPath();
            this.ctx.arc(obstacle.x, obstacle.y, obstacle.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#e94560';
            this.ctx.fill();
        });

        // Draw energy boosts
        this.energyBoosts.forEach(boost => {
            if (!boost.collected) {
                this.ctx.beginPath();
                this.ctx.arc(boost.x, boost.y, boost.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = '#4CAF50';
                this.ctx.fill();
            }
        });

        // Draw power-ups
        this.powerups.forEach(powerup => {
            if (!powerup.collected) {
                this.ctx.beginPath();
                this.ctx.arc(powerup.x, powerup.y, powerup.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = powerup.type === 'speed' ? '#00ffff' : '#ff00ff';
                this.ctx.fill();
                
                // Add icon or letter
                this.ctx.fillStyle = '#000';
                this.ctx.font = '12px Arial';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.fillText(powerup.type === 'speed' ? 'S' : 'P', powerup.x, powerup.y);
            }
        });

        // Draw competitors with visual indicators
        this.competitors.forEach(comp => {
            // Draw competitor tail
            if (comp.tail && comp.tail.length > 1) {
                this.ctx.beginPath();
                this.ctx.moveTo(comp.tail[0].x, comp.tail[0].y);
                comp.tail.forEach(pos => {
                    this.ctx.lineTo(pos.x, pos.y);
                });
                this.ctx.strokeStyle = 'rgba(255, 107, 107, 0.3)';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }

            // Draw competitor
            this.ctx.beginPath();
            this.ctx.arc(comp.x, comp.y, comp.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ff6b6b';
            this.ctx.fill();

            // Draw distance indicator (gets more red as they get closer to goal)
            const proximityWarning = Math.max(0, 1 - (comp.distanceToGoal / (this.canvas.width / 2)));
            if (proximityWarning > 0.3) { // Only show warning when somewhat close
                this.ctx.beginPath();
                this.ctx.arc(comp.x, comp.y, comp.radius + 5, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(255, 0, 0, ${proximityWarning})`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
        });

        // Draw active power-up indicators
        if (this.player.powerups.speedBoost > 0 || this.player.powerups.shield > 0) {
            this.ctx.save();
            this.ctx.translate(this.player.x, this.player.y);
            
            if (this.player.powerups.speedBoost > 0) {
                // Calculate opacity based on remaining time
                let opacity = 0.7;
                if (this.player.powerups.speedBoost <= 120) { // Last 2 seconds (at 60fps)
                    opacity = (Math.sin(Date.now() / 100) + 1) / 2 * 0.7; // Blink effect
                }
                
                this.ctx.beginPath();
                this.ctx.arc(0, 0, this.player.radius + 5, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(0, 255, 255, ${opacity})`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            
            if (this.player.powerups.shield > 0) {
                // Calculate opacity based on remaining time
                let opacity = 0.7;
                if (this.player.powerups.shield <= 120) { // Last 2 seconds (at 60fps)
                    opacity = (Math.sin(Date.now() / 100) + 1) / 2 * 0.7; // Blink effect
                }
                
                this.ctx.beginPath();
                this.ctx.arc(0, 0, this.player.radius + 8, 0, Math.PI * 2);
                this.ctx.strokeStyle = `rgba(255, 0, 255, ${opacity})`;
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
            }
            
            this.ctx.restore();
        }

        // Draw goal (egg)
        this.ctx.beginPath();
        this.ctx.arc(this.goal.x, this.goal.y, this.goal.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ffd700';
        this.ctx.fill();

        // Draw player (sperm)
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.fill();
    }

    gameLoop() {
        if (!this.isRunning) return;

        try {
            this.update();
            this.draw();
            requestAnimationFrame(() => this.gameLoop());
        } catch (error) {
            console.error('Error in game loop:', error);
            this.loseGame('An error occurred during gameplay');
        }
    }

    levelComplete() {
        if (!this.goal.reached) {  // Only complete level if no one else reached the goal
            this.level++;
            this.levelDisplay.textContent = this.level;
            this.energy = Math.min(100, this.energy + 50);
            this.player.x = 50;
            this.player.y = this.canvas.height / 2;
            this.goal.reached = false;  // Reset goal state
            this.setupLevel();
        }
    }

    loseGame(reason) {
        this.isRunning = false;
        this.addScore(this.currentScore);
        alert(`Game Over! ${reason}\nFinal Score: ${this.currentScore}`);
        this.menu.style.display = 'block';
        this.resetGame();
    }

    resetGame() {
        this.energy = 100;
        this.level = 1;
        this.currentScore = 0;
        this.currentScoreDisplay.textContent = '0';
        this.player.x = 50;
        this.player.y = this.canvas.height / 2;
        this.player.dx = 0;
        this.player.dy = 0;
        this.player.tail = [];
        this.player.powerups = {
            speedBoost: 0,
            shield: 0
        };
        this.setupLevel();
    }

    loadHighScores() {
        const scores = localStorage.getItem('highScores');
        return scores ? JSON.parse(scores) : [];
    }

    saveHighScores() {
        localStorage.setItem('highScores', JSON.stringify(this.highScores));
    }

    updateHighScoreDisplay() {
        const highestScore = this.highScores.length > 0 ? this.highScores[0].score : 0;
        this.highScoreDisplay.textContent = highestScore;
        this.updateScoreList();
    }

    updateScoreList() {
        this.scoreList.innerHTML = '';
        this.highScores.slice(0, 5).forEach((entry, index) => {
            const scoreEntry = document.createElement('div');
            scoreEntry.className = 'score-entry';
            scoreEntry.innerHTML = `
                <span>${index + 1}. ${entry.name}</span>
                <span>${entry.score}</span>
            `;
            this.scoreList.appendChild(scoreEntry);
        });
    }

    addScore(score) {
        const name = prompt('Enter your name for the high score:') || 'Anonymous';
        this.highScores.push({ name, score });
        this.highScores.sort((a, b) => b.score - a.score);
        this.highScores = this.highScores.slice(0, 10); // Keep top 10 scores
        this.saveHighScores();
        this.updateHighScoreDisplay();
    }
}

// Start the game when the page loads
window.onload = () => {
    new Game();
}; 