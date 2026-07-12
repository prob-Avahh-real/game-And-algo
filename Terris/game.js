const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('nextCanvas');
const nextCtx = nextCanvas.getContext('2d');

const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 25;

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;
nextCanvas.width = 4 * BLOCK_SIZE;
nextCanvas.height = 4 * BLOCK_SIZE;

const COLORS = [
    null,
    '#00f0f0',
    '#0000f0',
    '#f0a000',
    '#f0f000',
    '#00f000',
    '#a000f0',
    '#f00000'
];

const SHAPES = [
    [],
    [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]],
    [[2,0,0], [2,2,2], [0,0,0]],
    [[0,0,3], [3,3,3], [0,0,0]],
    [[4,4], [4,4]],
    [[0,5,5], [5,5,0], [0,0,0]],
    [[0,6,0], [6,6,6], [0,0,0]],
    [[7,7], [7,7]]
];

let board = [];
let currentPiece = null;
let nextPiece = null;
let score = 0;
let level = 1;
let lines = 0;
let gameLoop = null;
let isPaused = false;
let isGameOver = false;

function createBoard() {
    board = [];
    for (let row = 0; row < ROWS; row++) {
        board[row] = [];
        for (let col = 0; col < COLS; col++) {
            board[row][col] = 0;
        }
    }
}

function drawBlock(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x * BLOCK_SIZE, y * BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE);
    
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(x * BLOCK_SIZE + 2, y * BLOCK_SIZE + 2, BLOCK_SIZE - 4, 4);
}

function drawBoard() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
            if (board[row][col]) {
                drawBlock(ctx, col, row, COLORS[board[row][col]]);
            }
        }
    }
}

function drawPiece(piece, context = ctx, offsetX = 0, offsetY = 0) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                drawBlock(context, piece.x + x + offsetX, piece.y + y + offsetY, COLORS[value]);
            }
        });
    });
}

function drawNextPiece() {
    nextCtx.fillStyle = '#0a0a1a';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
    
    if (nextPiece) {
        const offsetX = (4 - nextPiece.shape[0].length) / 2;
        const offsetY = (4 - nextPiece.shape.length) / 2;
        nextPiece.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value) {
                    drawBlock(nextCtx, x + offsetX, y + offsetY, COLORS[value]);
                }
            });
        });
    }
}

function createPiece(type) {
    const shape = SHAPES[type].map(row => [...row]);
    return {
        shape: shape,
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0,
        type: type
    };
}

function randomPiece() {
    const type = Math.floor(Math.random() * 7) + 1;
    return createPiece(type);
}

function collision(piece, offsetX = 0, offsetY = 0) {
    for (let y = 0; y < piece.shape.length; y++) {
        for (let x = 0; x < piece.shape[y].length; x++) {
            if (piece.shape[y][x]) {
                const newX = piece.x + x + offsetX;
                const newY = piece.y + y + offsetY;
                
                if (newX < 0 || newX >= COLS || newY >= ROWS) {
                    return true;
                }
                
                if (newY >= 0 && board[newY][newX]) {
                    return true;
                }
            }
        }
    }
    return false;
}

function merge(piece) {
    piece.shape.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value) {
                const boardY = piece.y + y;
                const boardX = piece.x + x;
                if (boardY >= 0) {
                    board[boardY][boardX] = value;
                }
            }
        });
    });
}

function rotate(piece) {
    const rotated = piece.shape[0].map((_, i) =>
        piece.shape.map(row => row[i]).reverse()
    );
    const previousShape = piece.shape;
    piece.shape = rotated;
    
    if (collision(piece)) {
        piece.shape = previousShape;
    }
}

function clearLines() {
    let linesCleared = 0;
    
    for (let row = ROWS - 1; row >= 0; row--) {
        if (board[row].every(cell => cell !== 0)) {
            board.splice(row, 1);
            board.unshift(new Array(COLS).fill(0));
            linesCleared++;
            row++;
        }
    }
    
    if (linesCleared > 0) {
        const points = [0, 100, 300, 500, 800];
        score += points[linesCleared] * level;
        lines += linesCleared;
        level = Math.floor(lines / 10) + 1;
        
        updateScore();
    }
}

function updateScore() {
    document.getElementById('score').textContent = score;
    document.getElementById('level').textContent = level;
    document.getElementById('lines').textContent = lines;
}

function drop() {
    if (!collision(currentPiece, 0, 1)) {
        currentPiece.y++;
    } else {
        merge(currentPiece);
        clearLines();
        currentPiece = nextPiece;
        nextPiece = randomPiece();
        drawNextPiece();
        
        if (collision(currentPiece)) {
            gameOver();
        }
    }
}

function hardDrop() {
    while (!collision(currentPiece, 0, 1)) {
        currentPiece.y++;
        score += 2;
    }
    updateScore();
    drop();
}

function moveLeft() {
    if (!collision(currentPiece, -1, 0)) {
        currentPiece.x--;
    }
}

function moveRight() {
    if (!collision(currentPiece, 1, 0)) {
        currentPiece.x++;
    }
}

function moveDown() {
    if (!collision(currentPiece, 0, 1)) {
        currentPiece.y++;
        score += 1;
        updateScore();
    }
}

function gameOver() {
    isGameOver = true;
    clearInterval(gameLoop);
    document.getElementById('finalScore').textContent = score;
    document.getElementById('gameOver').style.display = 'flex';
}

function resetGame() {
    createBoard();
    score = 0;
    level = 1;
    lines = 0;
    isGameOver = false;
    isPaused = false;
    updateScore();
    
    currentPiece = randomPiece();
    nextPiece = randomPiece();
    drawNextPiece();
    
    document.getElementById('gameOver').style.display = 'none';
    document.getElementById('pauseBtn').textContent = 'Pause';
    
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, 1000 - (level - 1) * 100);
}

function update() {
    if (isPaused || isGameOver) return;
    
    drop();
    draw();
}

function draw() {
    drawBoard();
    if (currentPiece) {
        drawPiece(currentPiece);
    }
}

function togglePause() {
    if (isGameOver) return;
    
    isPaused = !isPaused;
    document.getElementById('pauseBtn').textContent = isPaused ? 'Resume' : 'Pause';
}

function getDropSpeed() {
    return Math.max(100, 1000 - (level - 1) * 100);
}

function updateGameSpeed() {
    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, getDropSpeed());
}

document.addEventListener('keydown', (e) => {
    if (isGameOver) return;
    
    if (e.key === 'ArrowLeft') {
        moveLeft();
        draw();
    } else if (e.key === 'ArrowRight') {
        moveRight();
        draw();
    } else if (e.key === 'ArrowDown') {
        moveDown();
        draw();
    } else if (e.key === 'ArrowUp') {
        rotate(currentPiece);
        draw();
    } else if (e.key === ' ') {
        hardDrop();
        draw();
    } else if (e.key === 'p' || e.key === 'P') {
        togglePause();
    }
});

document.getElementById('leftBtn').addEventListener('click', () => {
    if (!isPaused && !isGameOver) {
        moveLeft();
        draw();
    }
});

document.getElementById('rightBtn').addEventListener('click', () => {
    if (!isPaused && !isGameOver) {
        moveRight();
        draw();
    }
});

document.getElementById('downBtn').addEventListener('click', () => {
    if (!isPaused && !isGameOver) {
        moveDown();
        draw();
    }
});

document.getElementById('rotateBtn').addEventListener('click', () => {
    if (!isPaused && !isGameOver) {
        rotate(currentPiece);
        draw();
    }
});

document.getElementById('dropBtn').addEventListener('click', () => {
    if (!isPaused && !isGameOver) {
        hardDrop();
        draw();
    }
});

document.getElementById('pauseBtn').addEventListener('click', togglePause);
document.getElementById('restartBtn').addEventListener('click', resetGame);

let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});

canvas.addEventListener('touchend', (e) => {
    if (isPaused || isGameOver) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 30) {
            moveRight();
        } else if (diffX < -30) {
            moveLeft();
        }
    } else {
        if (diffY > 30) {
            hardDrop();
        } else if (diffY < -30) {
            rotate(currentPiece);
        }
    }
    
    draw();
});

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

resetGame();
