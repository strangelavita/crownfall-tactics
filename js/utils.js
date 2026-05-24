// ===== CROWNFALL TACTICS - UTILITIES =====

function $(selector) { return document.querySelector(selector); }
function $$(selector) { return document.querySelectorAll(selector); }

function showScreen(screenId) {
    $$('.screen').forEach(s => s.classList.remove('active'));
    $(`#${screenId}`).classList.add('active');
}

function showOverlay(overlayId) {
    $(`#${overlayId}`).classList.add('active');
}

function hideOverlay(overlayId) {
    $(`#${overlayId}`).classList.remove('active');
}

function toggleOverlay(overlayId) {
    $(`#${overlayId}`).classList.toggle('active');
}

// Delay helper
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms * getAnimSpeed()));
}

function getAnimSpeed() {
    const speed = localStorage.getItem('animSpeed') || '1';
    return parseFloat(speed);
}

// Random integer
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Clamp value
function clamp(val, min, max) {
    return Math.max(min, Math.min(max, val));
}

// Deep clone
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Get territory for row
function getTerritory(row) {
    if (row === 0) return 'enemy_core';
    if (row === 1) return 'enemy_front';
    if (row === 2) return 'neutral';
    if (row === 3) return 'player_front';
    if (row === 4) return 'player_core';
    return 'neutral';
}

// Check if tile is in player territory
function isPlayerTerritory(row) {
    return row >= 3;
}

// Check if tile is in enemy territory
function isEnemyTerritory(row) {
    return row <= 1;
}

// Get distance between two tiles
function getDistance(r1, c1, r2, c2) {
    return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}

// Check if two tiles are adjacent (orthogonal)
function isAdjacent(r1, c1, r2, c2) {
    return getDistance(r1, c1, r2, c2) === 1;
}

// Get adjacent tiles
function getAdjacentTiles(row, col) {
    const tiles = [];
    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (const [dr, dc] of dirs) {
        const nr = row + dr, nc = col + dc;
        if (nr >= 0 && nr < CONSTANTS.BOARD_ROWS && nc >= 0 && nc < CONSTANTS.BOARD_COLS) {
            tiles.push({ row: nr, col: nc });
        }
    }
    return tiles;
}

// Get tiles in straight line
function getStraightLineTiles(fromRow, fromCol, toRow, toCol) {
    const tiles = [];
    if (fromRow === toRow) {
        const step = toCol > fromCol ? 1 : -1;
        for (let c = fromCol + step; c !== toCol; c += step) {
            tiles.push({ row: fromRow, col: c });
        }
    } else if (fromCol === toCol) {
        const step = toRow > fromRow ? 1 : -1;
        for (let r = fromRow + step; r !== toRow; r += step) {
            tiles.push({ row: r, col: fromCol });
        }
    }
    return tiles;
}

// Check line of sight for archer and pikeman
function hasLineOfSight(board, fromRow, fromCol, toRow, toCol) {
    if (fromRow !== toRow && fromCol !== toCol) return false;
    const line = getStraightLineTiles(fromRow, fromCol, toRow, toCol);
    for (const tile of line) {
        if (board[tile.row][tile.col].unit) return false;
    }
    return true;
}

// Get valid move tiles
function getValidMoves(board, unit, row, col) {
    const moves = [];
    const range = unit.moveRange || 1;
    for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
        for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
            const dist = getDistance(row, col, r, c);
            if (dist > 0 && dist <= range && !board[r][c].unit) {
                moves.push({ row: r, col: c });
            }
        }
    }
    return moves;
}

// Get valid attack targets
function getValidAttacks(board, unit, row, col, owner) {
    const attacks = [];
    const range = unit.attackRange || 1;
    for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
        for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
            const dist = getDistance(row, col, r, c);
            const target = board[r][c].unit;
            if (dist > 0 && dist <= range && target && target.owner !== owner) {
                // Archer and Pikeman line of sight check
                if ((unit.id === 'archer' || unit.id === 'pikeman') && !hasLineOfSight(board, row, col, r, c)) continue;
                attacks.push({ row: r, col: c, target });
            }
        }
    }
    return attacks;
}

// Get valid deploy tiles
function getValidDeployTiles(board, isPlayer) {
    const tiles = [];
    const startRow = isPlayer ? 3 : 0;
    const endRow = isPlayer ? 4 : 1;
    for (let r = startRow; r <= endRow; r++) {
        for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
            if (!board[r][c].unit) {
                tiles.push({ row: r, col: c });
            }
        }
    }
    return tiles;
}

// Floating text
function showFloatingText(text, x, y, type = 'damage') {
    const container = $('#floating-container');
    const el = document.createElement('div');
    el.className = `floating-text ${type}`;
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    container.appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

// Log action
function logAction(message, type = 'system') {
    const logContent = $('#log-content');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = message;
    logContent.appendChild(entry);
    logContent.scrollTop = logContent.scrollHeight;
}

// Clear log
function clearLog() {
    $('#log-content').innerHTML = '';
}

// Format number with sign
function formatSigned(num) {
    return num >= 0 ? `+${num}` : `${num}`;
}

// Get territory score value
function getTerritoryScore(row, isPlayer) {
    const territory = getTerritory(row);
    let base = 0;
    if (isPlayer) {
        if (territory === 'enemy_core' || territory === 'enemy_front') base = CONSTANTS.SCORE_ENEMY;
        else if (territory === 'neutral') base = CONSTANTS.SCORE_NEUTRAL;
        else if (territory === 'player_front' || territory === 'player_core') base = CONSTANTS.SCORE_OWN;
    } else {
        if (territory === 'player_core' || territory === 'player_front') base = CONSTANTS.SCORE_ENEMY;
        else if (territory === 'neutral') base = CONSTANTS.SCORE_NEUTRAL;
        else if (territory === 'enemy_front' || territory === 'enemy_core') base = CONSTANTS.SCORE_OWN;
    }
    return base;
}

// Save settings
function saveSetting(key, value) {
    localStorage.setItem(key, value);
}

// Load settings
function loadSetting(key, defaultValue) {
    return localStorage.getItem(key) || defaultValue;
}
