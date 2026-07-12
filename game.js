class Game2048 {
    constructor() {
        this.size = 4;
        this.grid = [];
        this.score = 0;
        this.bestScore = localStorage.getItem('bestScore') || 0;
        this.gameOver = false;
        this.tileId = 0;
        
        this.gameBoard = document.getElementById('game-board');
        this.scoreElement = document.getElementById('score');
        this.bestScoreElement = document.getElementById('best-score');
        this.gameOverElement = document.getElementById('game-over');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.tryAgainBtn = document.getElementById('try-again-btn');
        this.capybara = document.getElementById('capybara');
        this.effectsContainer = document.getElementById('effects-container');
        
        this.cellSize = 0;
        this.gap = 12;
        
        this.init();
    }
    
    init() {
        this.calculateCellSize();
        this.createGrid();
        this.setupEventListeners();
        this.newGame();
        
        window.addEventListener('resize', () => {
            this.calculateCellSize();
            this.render();
        });
    }
    
    calculateCellSize() {
        const boardSize = this.gameBoard.clientWidth - 24; // padding
        this.cellSize = (boardSize - (this.size - 1) * this.gap) / this.size;
    }
    
    createGrid() {
        // Remove only grid cells, not capybara and effects container
        const existingCells = this.gameBoard.querySelectorAll('.grid-cell');
        existingCells.forEach(cell => cell.remove());
        
        // Create background grid cells
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.style.width = `${this.cellSize}px`;
                cell.style.height = `${this.cellSize}px`;
                cell.style.top = `${12 + row * (this.cellSize + this.gap)}px`;
                cell.style.left = `${12 + col * (this.cellSize + this.gap)}px`;
                this.gameBoard.appendChild(cell);
            }
        }
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        this.newGameBtn.addEventListener('click', () => this.newGame());
        this.tryAgainBtn.addEventListener('click', () => this.newGame());
        
        // Touch support
        let touchStartX, touchStartY;
        this.gameBoard.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        });
        
        this.gameBoard.addEventListener('touchend', (e) => {
            if (!touchStartX || !touchStartY) return;
            
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;
            
            const dx = touchEndX - touchStartX;
            const dy = touchEndY - touchStartY;
            
            const minSwipe = 50;
            
            if (Math.abs(dx) > Math.abs(dy)) {
                if (Math.abs(dx) > minSwipe) {
                    if (dx > 0) this.move('right');
                    else this.move('left');
                }
            } else {
                if (Math.abs(dy) > minSwipe) {
                    if (dy > 0) this.move('down');
                    else this.move('up');
                }
            }
            
            touchStartX = null;
            touchStartY = null;
        });
    }
    
    handleKeyDown(e) {
        if (this.gameOver) return;
        
        const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right'
        };
        
        if (keyMap[e.key]) {
            e.preventDefault();
            this.move(keyMap[e.key]);
        }
    }
    
    newGame() {
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(null));
        this.score = 0;
        this.gameOver = false;
        this.tileId = 0;
        
        this.gameOverElement.style.display = 'none';
        this.updateScore();
        
        // Clear existing tiles
        const existingTiles = this.gameBoard.querySelectorAll('.tile');
        existingTiles.forEach(tile => tile.remove());
        
        // Position capybara in random corner
        this.positionCapybara();
        
        // Add two initial tiles with the same value
        const startValue = Math.random() < 0.9 ? 2 : 4;
        this.addRandomTile(startValue);
        this.addRandomTile(startValue);
        
        this.render();
    }
    
    addRandomTile(value = null) {
        const emptyCells = [];
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (!this.grid[row][col]) {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        if (emptyCells.length === 0) return false;
        
        const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        const tileValue = value !== null ? value : (Math.random() < 0.9 ? 2 : 4);
        
        this.grid[row][col] = {
            value: tileValue,
            id: this.tileId++,
            isNew: true,
            merged: false
        };
        
        return true;
    }
    
    move(direction) {
        if (this.gameOver) return;
        
        // Clear merge flags
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col]) {
                    this.grid[row][col].merged = false;
                    this.grid[row][col].isNew = false;
                }
            }
        }
        
        let moved = false;
        let moveScore = 0;
        const vectors = {
            up: { row: -1, col: 0 },
            down: { row: 1, col: 0 },
            left: { row: 0, col: -1 },
            right: { row: 0, col: 1 }
        };
        
        const vector = vectors[direction];
        const traversals = this.buildTraversals(vector);
        
        traversals.row.forEach(row => {
            traversals.col.forEach(col => {
                const tile = this.grid[row][col];
                
                if (tile) {
                    const { farthest, next } = this.findFarthestPosition(row, col, vector);
                    const nextTile = next ? this.grid[next.row][next.col] : null;
                    
                    if (nextTile && nextTile.value === tile.value && !nextTile.merged) {
                        // Merge
                        const mergedValue = tile.value * 2;
                        this.grid[next.row][next.col] = {
                            value: mergedValue,
                            id: this.tileId++,
                            merged: true,
                            isNew: false
                        };
                        this.grid[row][col] = null;
                        this.score += mergedValue;
                        moveScore += mergedValue;
                        moved = true;
                    } else if (farthest.row !== row || farthest.col !== col) {
                        // Move
                        this.grid[farthest.row][farthest.col] = tile;
                        this.grid[row][col] = null;
                        moved = true;
                    }
                }
            });
        });
        
        if (moved) {
            this.addRandomTile();
            this.updateScore();
            this.render();
            
            // Trigger celebration effects if move score >= 32
            if (moveScore >= 32) {
                this.triggerCelebration();
            }
            
            if (this.isGameOver()) {
                this.gameOver = true;
                setTimeout(() => {
                    this.gameOverElement.style.display = 'flex';
                }, 300);
            }
        }
    }
    
    buildTraversals(vector) {
        const traversals = { row: [], col: [] };
        
        for (let i = 0; i < this.size; i++) {
            traversals.row.push(i);
            traversals.col.push(i);
        }
        
        if (vector.row === 1) traversals.row.reverse();
        if (vector.col === 1) traversals.col.reverse();
        
        return traversals;
    }
    
    findFarthestPosition(row, col, vector) {
        let previous;
        let currentRow = row;
        let currentCol = col;
        
        do {
            previous = { row: currentRow, col: currentCol };
            currentRow += vector.row;
            currentCol += vector.col;
        } while (this.isWithinBounds(currentRow, currentCol) && !this.grid[currentRow][currentCol]);
        
        return {
            farthest: previous,
            next: this.isWithinBounds(currentRow, currentCol) ? { row: currentRow, col: currentCol } : null
        };
    }
    
    isWithinBounds(row, col) {
        return row >= 0 && row < this.size && col >= 0 && col < this.size;
    }
    
    isGameOver() {
        // Check for empty cells
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (!this.grid[row][col]) return false;
            }
        }
        
        // Check for possible merges
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const tile = this.grid[row][col];
                
                // Check right
                if (col < this.size - 1 && this.grid[row][col + 1] && this.grid[row][col + 1].value === tile.value) {
                    return false;
                }
                
                // Check down
                if (row < this.size - 1 && this.grid[row + 1][col] && this.grid[row + 1][col].value === tile.value) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    updateScore() {
        this.scoreElement.textContent = this.score;
        
        if (this.score > this.bestScore) {
            this.bestScore = this.score;
            localStorage.setItem('bestScore', this.bestScore);
        }
        
        this.bestScoreElement.textContent = this.bestScore;
    }
    
    render() {
        // Remove existing tiles
        const existingTiles = this.gameBoard.querySelectorAll('.tile');
        existingTiles.forEach(tile => tile.remove());
        
        // Render current tiles
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const tile = this.grid[row][col];
                
                if (tile) {
                    const tileElement = document.createElement('div');
                    tileElement.className = `tile tile-${tile.value > 2048 ? 'super' : tile.value}`;
                    
                    if (tile.isNew) {
                        tileElement.classList.add('tile-new');
                    }
                    
                    if (tile.merged) {
                        tileElement.classList.add('tile-merged');
                    }
                    
                    tileElement.style.width = `${this.cellSize}px`;
                    tileElement.style.height = `${this.cellSize}px`;
                    tileElement.style.top = `${12 + row * (this.cellSize + this.gap)}px`;
                    tileElement.style.left = `${12 + col * (this.cellSize + this.gap)}px`;
                    tileElement.style.fontSize = tile.value >= 1000 ? '28px' : tile.value >= 100 ? '36px' : '44px';
                    tileElement.textContent = tile.value;
                    
                    this.gameBoard.appendChild(tileElement);
                }
            }
        }
    }
    
    positionCapybara() {
        const corners = [
            { top: '20px', left: '20px' },           // top-left
            { top: '20px', right: '20px' },          // top-right
            { bottom: '20px', left: '20px' },       // bottom-left
            { bottom: '20px', right: '20px' }        // bottom-right
        ];
        
        const randomCorner = corners[Math.floor(Math.random() * corners.length)];
        
        // Reset position
        this.capybara.style.top = '';
        this.capybara.style.bottom = '';
        this.capybara.style.left = '';
        this.capybara.style.right = '';
        
        // Apply random corner position
        Object.assign(this.capybara.style, randomCorner);
    }
    
    triggerCelebration() {
        // Play celebration sound
        this.playCelebrationSound();
        
        // Make capybara shake
        this.capybara.classList.add('shaking');
        setTimeout(() => {
            this.capybara.classList.remove('shaking');
        }, 500);
        
        // Random celebration effects
        const effects = ['🎉', '🎊', '👏', '🌟', '💫', '✨', '🎈', '🌸', '🎵', '💖', '🔥', '⭐', '🌈', '💎', '🏆'];
        const numEffects = Math.floor(Math.random() * 5) + 5; // 5-9 effects
        const duration = (Math.random() * 0.5 + 1).toFixed(2); // 1-1.5 seconds
        
        for (let i = 0; i < numEffects; i++) {
            setTimeout(() => {
                const effect = document.createElement('div');
                effect.className = 'effect';
                effect.textContent = effects[Math.floor(Math.random() * effects.length)];
                effect.style.setProperty('--duration', `${duration}s`);
                
                // Random position around the board
                const x = Math.random() * 80 + 10; // 10-90% of board width
                const y = Math.random() * 80 + 10; // 10-90% of board height
                effect.style.left = `${x}%`;
                effect.style.top = `${y}%`;
                
                this.effectsContainer.appendChild(effect);
                
                // Remove effect after animation
                setTimeout(() => {
                    effect.remove();
                }, duration * 1000);
            }, i * 100);
        }
    }
    
    playCelebrationSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Create a cheerful chord
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            
            notes.forEach((freq, index) => {
                setTimeout(() => {
                    const oscillator = audioContext.createOscillator();
                    const gainNode = audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioContext.destination);
                    
                    oscillator.type = 'sine';
                    oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
                    
                    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
                    
                    oscillator.start(audioContext.currentTime);
                    oscillator.stop(audioContext.currentTime + 0.3);
                }, index * 50);
            });
        } catch (e) {
            // Audio not supported or blocked
            console.log('Audio not available');
        }
    }
}

// Start the game
document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
