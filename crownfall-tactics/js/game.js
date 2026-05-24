// ===== CROWNFALL TACTICS - MAIN GAME ENGINE =====

class Game {
    constructor() {
        this.board = [];
        this.playerDeck = [];
        this.enemyDeck = [];
        this.playerHand = [];
        this.enemyHand = [];
        this.playerSpaceCards = [];
        this.enemySpaceCards = [];
        this.round = 1;
        this.phase = CONSTANTS.PHASE.DRAW;
        this.playerAP = 0;
        this.enemyAP = 0;
        this.playerScore = 0;
        this.enemyScore = 0;
        this.currentTurn = 'player';
        this.selectedCard = null;
        this.selectedUnit = null;
        this.selectedSpaceCard = null;
        this.units = [];
        this.unitsActed = new Set();
        this.difficulty = 'normal';
        this.gameMode = 'vs_ai';
        this.isGameOver = false;
        this.kingAlive = { player: true, enemy: true };
        this.popeCooldowns = { player: 0, enemy: 0 };
        this.spaceCardEffects = [];
        this.stunnedUnits = new Set();
        this.convertedUnits = new Set();
        this.towerDamages = [];
        this.init();
    }

    init() {
        this.initBoard();
        this.playerDeck = buildDeck();
        this.enemyDeck = buildDeck();
        this.drawStartingHands();
    }

    initBoard() {
        this.board = [];
        for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
            const row = [];
            for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                row.push({
                    row: r, col: c, unit: null, spaceCard: null,
                    coords: CONSTANTS.COORDS[r][c]
                });
            }
            this.board.push(row);
        }
    }

    drawStartingHands() {
        for (let i = 0; i < CONSTANTS.STARTING_HAND_SIZE; i++) {
            this.drawCard('player');
            this.drawCard('enemy');
        }
    }

    drawCard(owner) {
        const deck = owner === 'player' ? this.playerDeck : this.enemyDeck;
        const hand = owner === 'player' ? this.playerHand : this.enemyHand;
        if (deck.length > 0) {
            const card = deck.pop();
            hand.push({ ...card, owner });
            return card;
        }
        return null;
    }

    startMatch() {
        this.round = 1; this.playerScore = 0; this.enemyScore = 0;
        this.phase = CONSTANTS.PHASE.DRAW; this.currentTurn = 'player';
        this.isGameOver = false;
        this.kingAlive = { player: true, enemy: true };
        this.popeCooldowns = { player: 0, enemy: 0 };
        this.unitsActed.clear();
        this.stunnedUnits.clear();
        this.convertedUnits.clear();
        this.spaceCardEffects = [];
        this.init();
        this.placeSpaceCards();
        showScreen('game-screen');
        this.startRound();
    }

    placeSpaceCards() {
        for (const card of this.playerSpaceCards) {
            if (card.placedAt) {
                const { row, col } = card.placedAt;
                this.board[row][col].spaceCard = { ...card, owner: 'player' };
            }
        }
        for (const card of this.enemySpaceCards) {
            if (card.placedAt) {
                const { row, col } = card.placedAt;
                this.board[row][col].spaceCard = { ...card, owner: 'enemy' };
            }
        }
    }

    async startRound() {
        logAction(`=== Round ${this.round} ===`, 'system');
        this.phase = CONSTANTS.PHASE.DRAW;
        await this.drawPhase();
        this.phase = CONSTANTS.PHASE.PLAYER_TURN;
        this.currentTurn = 'player';
        this.playerAP = CONSTANTS.AP_PER_TURN;
        this.unitsActed.clear();
        await this.applyTowerDamage('player');
        this.updateUI();
        logAction('Player turn begins!', 'player');
    }

    async drawPhase() {
        const playerCard = this.drawCard('player');
        const enemyCard = this.drawCard('enemy');
        if (playerCard) logAction(`Player drew ${playerCard.name}`, 'player');
        if (enemyCard) logAction(`Enemy drew ${enemyCard.name}`, 'enemy');
        await delay(300);
    }

    async endPlayerTurn() {
        if (this.currentTurn !== 'player') return;
        this.selectedCard = null;
        this.selectedUnit = null;
        this.currentTurn = 'enemy';
        this.phase = CONSTANTS.PHASE.ENEMY_TURN;
        this.enemyAP = CONSTANTS.AP_PER_TURN;
        this.unitsActed.clear();
        this.updateUI();
        logAction('Enemy turn begins!', 'enemy');
        await this.applyTowerDamage('enemy');
        if (this.gameMode === 'vs_ai') {
            await this.executeAITurn();
        }
    }

    async executeAITurn() {
        await delay(500);
        const ai = new AI(this, this.difficulty);
        const actions = ai.getActions();
        for (const action of actions) {
            if (this.isGameOver) break;
            await this.executeAIAction(action);
            await delay(400);
        }
        await this.endEnemyTurn();
    }

    async executeAIAction(action) {
        switch (action.type) {
            case 'deploy': await this.deployUnit('enemy', action.card, action.row, action.col); break;
            case 'move': await this.moveUnit(action.unit, action.toRow, action.toCol); break;
            case 'attack': await this.attackUnit(action.unit, action.targetRow, action.targetCol); break;
            case 'ability': 
                if (action.ability === 'architect') {
                    await this.useArchitectAbility(action.unit, action.targetRow, action.targetCol);
                } else {
                    await this.useAbility(action.unit, action.targetRow, action.targetCol);
                }
                break;
        }
    }

    async endEnemyTurn() {
        if (this.isGameOver) return;
        this.selectedCard = null;
        this.selectedUnit = null;
        this.phase = CONSTANTS.PHASE.RESOLUTION;
        await this.resolutionPhase();
        if (this.round >= CONSTANTS.TOTAL_ROUNDS) {
            await this.endGame();
            return;
        }
        this.round++;
        if (this.popeCooldowns.player > 0) this.popeCooldowns.player--;
        if (this.popeCooldowns.enemy > 0) this.popeCooldowns.enemy--;
        this.stunnedUnits.clear();
        this.clearUsedSpaceCards();
        await this.startRound();
    }

    async resolutionPhase() {
        logAction('--- Resolution Phase ---', 'system');

        // Reduce disabled rounds on space cards
        for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
            for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                const sc = this.board[r][c].spaceCard;
                if (sc && sc.disabled && sc.disabledRounds > 0) {
                    sc.disabledRounds--;
                    if (sc.disabledRounds <= 0) {
                        sc.disabled = false;
                        logAction(`${sc.name} is no longer disabled.`, 'system');
                    }
                }
            }
        }
        const playerTerritoryScore = this.calculateTerritoryScore('player');
        const enemyTerritoryScore = this.calculateTerritoryScore('enemy');
        let multiplier = 1;
        if (CONSTANTS.FINAL_ROUNDS.includes(this.round)) {
            multiplier = CONSTANTS.SCORE_FINAL_MULTIPLIER;
            logAction(`Final round! Scoring x${multiplier}`, 'system');
        }
        this.playerScore += playerTerritoryScore * multiplier;
        this.enemyScore += enemyTerritoryScore * multiplier;
        logAction(`Player scored ${playerTerritoryScore * multiplier} points`, 'player');
        logAction(`Enemy scored ${enemyTerritoryScore * multiplier} points`, 'enemy');
        this.updateUI();
        await delay(800);
    }

    calculateTerritoryScore(owner) {
        let score = 0;
        for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
            for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                const tile = this.board[r][c];
                if (tile.unit && tile.unit.owner === owner) {
                    score += getTerritoryScore(r, owner === 'player');
                }
            }
        }
        return score;
    }

    async applyTowerDamage(turnOwner) {
        for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
            for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                const tile = this.board[r][c];
                if (tile.spaceCard && tile.spaceCard.id === 'tower' && tile.spaceCard.owner === turnOwner && !tile.spaceCard.disabled) {
                    const adjacent = getAdjacentTiles(r, c);
                    for (const adj of adjacent) {
                        const adjTile = this.board[adj.row][adj.col];
                        if (adjTile.unit && adjTile.unit.owner !== turnOwner) {
                            adjTile.unit.currentHealth -= 5;
                            this.showDamage(adj.row, adj.col, 5);
                            logAction(`Tower dealt 5 damage to ${adjTile.unit.name}`, 'system');
                            if (adjTile.unit.currentHealth <= 0) {
                                await this.killUnit(adj.row, adj.col);
                            }
                        }
                    }
                }
            }
        }
        this.updateUI();
    }

    clearUsedSpaceCards() {
        for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
            for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                const tile = this.board[r][c];
                if (tile.spaceCard && tile.spaceCard.type === 'one-time' && tile.spaceCard.used) {
                    tile.spaceCard = null;
                }
            }
        }
    }

    selectCard(index) {
        if (this.phase !== CONSTANTS.PHASE.PLAYER_TURN && this.phase !== CONSTANTS.PHASE.ENEMY_TURN) return;
        const currentHand = this.currentTurn === 'player' ? this.playerHand : this.enemyHand;
        const currentAP = this.currentTurn === 'player' ? this.playerAP : this.enemyAP;
        const card = currentHand[index];
        if (!card || card.apCost > currentAP) return;
        this.selectedCard = { card, index };
        this.selectedUnit = null;
        this.renderBoard();
        this.renderHand();
    }

    selectUnit(row, col) {
        const tile = this.board[row][col];
        if (!tile.unit || tile.unit.owner !== this.currentTurn) return;
        this.selectedUnit = { unit: tile.unit, row, col };
        this.selectedCard = null;
        this.renderBoard();
        this.renderUnitInfo(tile.unit);
    }

    async clickTile(row, col) {
        if (this.phase !== CONSTANTS.PHASE.PLAYER_TURN && this.phase !== CONSTANTS.PHASE.ENEMY_TURN) return;
        if (this.isGameOver) return;

        const currentOwner = this.currentTurn;
        const tile = this.board[row][col];

        // Deploy selected card
        if (this.selectedCard) {
            if (this.canDeploy(currentOwner, row, col)) {
                const card = this.selectedCard.card;
                await this.deployUnit(currentOwner, card, row, col);
                if (currentOwner === 'player') {
                    this.playerHand.splice(this.selectedCard.index, 1);
                    this.playerAP -= card.apCost;
                } else {
                    this.enemyHand.splice(this.selectedCard.index, 1);
                    this.enemyAP -= card.apCost;
                }
                this.selectedCard = null;
                this.updateUI();
            } else {
                // Invalid deploy - deselect
                this.selectedCard = null;
                this.renderBoard();
            }
            return;
        }

        // Action with selected unit
        if (this.selectedUnit) {
            const { unit, row: fromRow, col: fromCol } = this.selectedUnit;
            const dist = getDistance(fromRow, fromCol, row, col);

            // Move
            if (!tile.unit && dist <= unit.moveRange && !this.unitsActed.has(unit.instanceId)) {
                await this.moveUnit(unit, row, col);
                this.unitsActed.add(unit.instanceId);
                if (currentOwner === 'player') this.playerAP -= 1;
                else this.enemyAP -= 1;
                this.selectedUnit = null;
                this.updateUI();
                return;
            }

            // Attack
            if (tile.unit && tile.unit.owner !== currentOwner && dist <= unit.attackRange) {
                if ((unit.id === 'archer' || unit.id === 'pikeman') && !hasLineOfSight(this.board, fromRow, fromCol, row, col)) {
                    logAction(`${unit.name} requires line of sight!`, 'system');
                    this.selectedUnit = null;
                    this.renderBoard();
                    return;
                }
                if (this.unitsActed.has(unit.instanceId) && unit.id !== 'knight') {
                    this.selectedUnit = null;
                    this.renderBoard();
                    return;
                }
                await this.attackUnit(unit, row, col);
                if (unit.id === 'knight') {
                    this.unitsActed.add(`${unit.instanceId}_attacked`);
                } else {
                    this.unitsActed.add(unit.instanceId);
                }
                if (currentOwner === 'player') this.playerAP -= 1;
                else this.enemyAP -= 1;
                this.selectedUnit = null;
                this.updateUI();
                return;
            }

            // Architect ability - destroy/disable adjacent space cards
            if (unit.id === 'architect' && dist <= 1) {
                const adjTile = this.board[row][col];
                if (adjTile.spaceCard && adjTile.spaceCard.owner !== currentOwner) {
                    const sc = adjTile.spaceCard;
                    if (sc.type === 'one-time' && !sc.used) {
                        // Destroy unactivated one-time card
                        adjTile.spaceCard = null;
                        logAction(`Architect destroyed ${sc.name}!`, currentOwner);
                        this.unitsActed.add(unit.instanceId);
                        if (currentOwner === 'player') this.playerAP -= 1;
                        else this.enemyAP -= 1;
                        this.selectedUnit = null;
                        this.updateUI();
                        return;
                    } else if (sc.type === 'permanent') {
                        // Disable permanent card for 2 rounds
                        sc.disabled = true;
                        sc.disabledRounds = 2;
                        logAction(`Architect disabled ${sc.name} for 2 rounds!`, currentOwner);
                        this.unitsActed.add(unit.instanceId);
                        if (currentOwner === 'player') this.playerAP -= 1;
                        else this.enemyAP -= 1;
                        this.selectedUnit = null;
                        this.updateUI();
                        return;
                    }
                }
            }

            // Pope convert
            if (unit.id === 'pope' && tile.unit && tile.unit.owner !== currentOwner && dist <= 1) {
                const cd = currentOwner === 'player' ? this.popeCooldowns.player : this.popeCooldowns.enemy;
                if (cd > 0) {
                    logAction(`Pope on cooldown (${cd} rounds)`, 'system');
                    this.selectedUnit = null;
                    this.renderBoard();
                    return;
                }
                if (tile.unit.id === 'king' || tile.unit.id === 'knight') {
                    logAction('Cannot convert King or Knight!', 'system');
                    this.selectedUnit = null;
                    this.renderBoard();
                    return;
                }
                await this.usePopeConvert(unit, row, col);
                if (currentOwner === 'player') {
                    this.popeCooldowns.player = CONSTANTS.POPE_COOLDOWN;
                    this.playerAP -= tile.unit.apCost;
                } else {
                    this.popeCooldowns.enemy = CONSTANTS.POPE_COOLDOWN;
                    this.enemyAP -= tile.unit.apCost;
                }
                this.unitsActed.add(unit.instanceId);
                this.selectedUnit = null;
                this.updateUI();
                return;
            }

            // Clicked elsewhere - deselect unit
            this.selectedUnit = null;
            this.renderBoard();

            // If clicked on another own unit, select it
            if (tile.unit && tile.unit.owner === currentOwner) {
                this.selectUnit(row, col);
            }
            return;
        }

        // Select unit on tile
        if (tile.unit && tile.unit.owner === currentOwner) {
            this.selectUnit(row, col);
        }
    }

    canDeploy(owner, row, col) {
        const tile = this.board[row][col];
        if (tile.unit) return false;
        const currentAP = owner === 'player' ? this.playerAP : this.enemyAP;
        if (owner === 'player') {
            return row >= 3 && currentAP >= this.selectedCard.card.apCost;
        } else {
            return row <= 1 && currentAP >= this.selectedCard.card.apCost;
        }
    }

    async deployUnit(owner, card, row, col) {
        const unit = {
            ...card, owner,
            currentHealth: card.health,
            hasMoved: false, hasAttacked: false,
            summonedThisTurn: true, buffs: []
        };
        const tile = this.board[row][col];
        if (tile.spaceCard && tile.spaceCard.id === 'castle' && !tile.spaceCard.disabled) {
            unit.maxHealth = (unit.maxHealth || unit.health) + 40;
            unit.health = unit.maxHealth;
            unit.currentHealth = unit.maxHealth;
        }
        this.applyKingBuffs();
        this.board[row][col].unit = unit;
        this.units.push(unit);
        logAction(`${owner === 'player' ? 'Player' : 'Enemy'} deployed ${card.name} at ${CONSTANTS.COORDS[row][col]}`, owner);
        const tileEl = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (tileEl) { tileEl.classList.add('shake'); setTimeout(() => tileEl.classList.remove('shake'), 300); }
        this.renderBoard();
        await delay(200);
    }

    async moveUnit(unit, toRow, toCol) {
        const fromPos = this.findUnit(unit);
        if (!fromPos) return;
        const { row: fromRow, col: fromCol } = fromPos;
        this.board[toRow][toCol].unit = unit;
        this.board[fromRow][fromCol].unit = null;
        unit.hasMoved = true;
        const tile = this.board[toRow][toCol];

        // Space card triggers on move
        if (tile.spaceCard && tile.spaceCard.owner !== unit.owner) {
            const sc = tile.spaceCard;
            if (sc.id === 'volcano') {
                sc.used = true;
                unit.volcanoEffect = true;
                logAction(`${unit.name} stepped on Volcano! Cannot move, takes +50% damage.`, 'system');
            } else if (sc.id === 'rage_potion') {
                sc.used = true;
                unit.ragePotion = true;
                logAction(`${unit.name} drank Rage Potion! Next attack deals 200% damage.`, 'system');
            } else if (sc.id === 'health_potion') {
                sc.used = true;
                const oldHp = unit.currentHealth;
                unit.currentHealth = unit.maxHealth || unit.health;
                logAction(`${unit.name} drank Health Potion! Restored to full health (${unit.currentHealth - oldHp} HP).`, 'system');
                const tileEl = document.querySelector(`[data-row="${toRow}"][data-col="${toCol}"]`);
                if (tileEl) {
                    const rect = tileEl.getBoundingClientRect();
                    showFloatingText(`+${unit.currentHealth - oldHp}`, rect.left + rect.width / 2, rect.top, 'heal');
                }
            } else if (sc.id === 'shield') {
                sc.used = true;
                unit.shield = true;
                logAction(`${unit.name} picked up a Shield! Blocks next incoming damage.`, 'system');
            }
        }

        logAction(`${unit.owner === 'player' ? 'Player' : 'Enemy'} moved ${unit.name} to ${CONSTANTS.COORDS[toRow][toCol]}`, unit.owner);
        this.applyKingBuffs();
        this.renderBoard();
        await delay(200);
    }

    async attackUnit(attacker, targetRow, targetCol) {
        const targetTile = this.board[targetRow][targetCol];
        if (!targetTile.unit) return;
        const target = targetTile.unit;
        let damage = attacker.attack || 0;

        const attackerPos = this.findUnit(attacker);
        if (attackerPos) {
            const king = this.findKing(attacker.owner);
            if (king) {
                const kingTerritory = getTerritory(king.row);
                if (attacker.owner === 'player' && (kingTerritory === 'enemy_core' || kingTerritory === 'enemy_front')) {
                    damage += 20;
                } else if (attacker.owner === 'enemy' && (kingTerritory === 'player_core' || kingTerritory === 'player_front')) {
                    damage += 20;
                }
            }
        }

        if (attacker.ragePotion) { damage *= 2; attacker.ragePotion = false; }
        if (target.volcanoEffect) { damage = Math.floor(damage * 1.5); }
        if (target.shield) {
            damage = 0; target.shield = false;
            logAction(`${target.name}'s shield blocked the attack!`, 'system');
        }
        target.currentHealth -= damage;
        attacker.hasAttacked = true;
        this.showDamage(targetRow, targetCol, damage);
        logAction(`${attacker.name} dealt ${damage} damage to ${target.name}`, attacker.owner);
        if (target.currentHealth <= 0) {
            await this.killUnit(targetRow, targetCol);
        }
        this.renderBoard();
        await delay(300);
    }

    async useArchitectAbility(architect, targetRow, targetCol) {
        const tile = this.board[targetRow][targetCol];
        if (!tile.spaceCard || tile.spaceCard.owner === architect.owner) return;

        const sc = tile.spaceCard;
        if (sc.type === 'one-time' && !sc.used) {
            tile.spaceCard = null;
            logAction(`Architect destroyed ${sc.name}!`, architect.owner);
        } else if (sc.type === 'permanent') {
            sc.disabled = true;
            sc.disabledRounds = 2;
            logAction(`Architect disabled ${sc.name} for 2 rounds!`, architect.owner);
        }
        this.renderBoard();
        await delay(300);
    }

    async usePopeConvert(pope, targetRow, targetCol) {
        const targetTile = this.board[targetRow][targetCol];
        if (!targetTile.unit) return;
        const target = targetTile.unit;
        const roll = Math.random();
        if (roll < CONSTANTS.POPE_CONVERT_CHANCE) {
            target.owner = pope.owner;
            this.convertedUnits.add(target.instanceId);
            this.stunnedUnits.add(target.instanceId);
            logAction(`Pope converted ${target.name}!`, pope.owner);
        } else {
            logAction(`Pope failed to convert ${target.name}`, 'system');
        }
        this.renderBoard();
        await delay(300);
    }

    async killUnit(row, col) {
        const tile = this.board[row][col];
        const unit = tile.unit;
        if (!unit) return;
        logAction(`${unit.name} was destroyed!`, 'system');

        if (unit.id === 'king') {
            if (unit.owner === 'player') {
                this.kingAlive.player = false;
                logAction('Player King has fallen! GAME OVER!', 'system');
            } else {
                this.kingAlive.enemy = false;
                logAction('Enemy King has fallen! GAME OVER!', 'system');
            }
            tile.unit = null;
            this.units = this.units.filter(u => u.instanceId !== unit.instanceId);
            this.renderBoard();
            this.updateUI();
            await delay(500);
            await this.endGame();
            return;
        }

        tile.unit = null;
        this.units = this.units.filter(u => u.instanceId !== unit.instanceId);
        this.renderBoard();
        await delay(200);
    }

    findUnit(unit) {
        for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
            for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                if (this.board[r][c].unit === unit) {
                    return { row: r, col: c };
                }
            }
        }
        return null;
    }

    findKing(owner) {
        for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
            for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                const unit = this.board[r][c].unit;
                if (unit && unit.id === 'king' && unit.owner === owner) {
                    return { row: r, col: c, unit };
                }
            }
        }
        return null;
    }

    applyKingBuffs() {
        const playerKing = this.findKing('player');
        const enemyKing = this.findKing('enemy');
        for (const unit of this.units) { unit.buffs = []; }

        if (playerKing) {
            const kingTerritory = getTerritory(playerKing.row);
            for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
                for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                    const unit = this.board[r][c].unit;
                    if (unit && unit.owner === 'player' && unit.id !== 'king') {
                        const unitTerritory = getTerritory(r);
                        if (unitTerritory === 'player_core' || unitTerritory === 'player_front') {
                            if (!unit.buffs.includes('king_health')) {
                                unit.maxHealth = (unit.maxHealth || unit.health) + 15;
                                unit.health = unit.maxHealth;
                                unit.currentHealth = Math.min(unit.currentHealth + 15, unit.maxHealth);
                                unit.buffs.push('king_health');
                            }
                        }
                        if (unitTerritory === 'enemy_core' || unitTerritory === 'enemy_front') {
                            if (kingTerritory === 'enemy_core' || kingTerritory === 'enemy_front') {
                                unit.buffs.push('king_attack');
                                if (!unit.buffs.includes('king_health')) {
                                    unit.maxHealth = (unit.maxHealth || unit.health) + 15;
                                    unit.health = unit.maxHealth;
                                    unit.currentHealth = Math.min(unit.currentHealth + 15, unit.maxHealth);
                                    unit.buffs.push('king_health');
                                }
                            }
                        }
                    }
                }
            }
        }

        if (enemyKing) {
            const kingTerritory = getTerritory(enemyKing.row);
            for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
                for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                    const unit = this.board[r][c].unit;
                    if (unit && unit.owner === 'enemy' && unit.id !== 'king') {
                        const unitTerritory = getTerritory(r);
                        if (unitTerritory === 'enemy_core' || unitTerritory === 'enemy_front') {
                            if (!unit.buffs.includes('king_health')) {
                                unit.maxHealth = (unit.maxHealth || unit.health) + 15;
                                unit.health = unit.maxHealth;
                                unit.currentHealth = Math.min(unit.currentHealth + 15, unit.maxHealth);
                                unit.buffs.push('king_health');
                            }
                        }
                        if (unitTerritory === 'player_core' || unitTerritory === 'player_front') {
                            if (kingTerritory === 'player_core' || kingTerritory === 'player_front') {
                                unit.buffs.push('king_attack');
                                if (!unit.buffs.includes('king_health')) {
                                    unit.maxHealth = (unit.maxHealth || unit.health) + 15;
                                    unit.health = unit.maxHealth;
                                    unit.currentHealth = Math.min(unit.currentHealth + 15, unit.maxHealth);
                                    unit.buffs.push('king_health');
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    showDamage(row, col, damage) {
        const tile = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (tile) {
            const rect = tile.getBoundingClientRect();
            showFloatingText(`-${damage}`, rect.left + rect.width / 2, rect.top, 'damage');
        }
    }

    updateUI() {
        $('#round-number').textContent = this.round;
        $('#ap-value').textContent = this.currentTurn === 'player' ? this.playerAP : this.enemyAP;
        $('#player-score').textContent = this.playerScore;
        $('#enemy-score').textContent = this.enemyScore;
        $('#deck-count').textContent = this.currentTurn === 'player' ? this.playerDeck.length : this.enemyDeck.length;

        // Update score labels for hotseat
        const playerLabel = $('#player-label');
        const enemyLabel = $('#enemy-label');
        if (playerLabel) playerLabel.textContent = this.gameMode === 'hotseat' ? 'P1' : 'You';
        if (enemyLabel) enemyLabel.textContent = this.gameMode === 'hotseat' ? 'P2' : 'Enemy';

        const turnIndicator = $('#turn-indicator');
        const turnLabel = turnIndicator.querySelector('.turn-label');

        if (this.currentTurn === 'player') {
            turnIndicator.className = 'turn-indicator player-turn';
            turnLabel.textContent = this.gameMode === 'hotseat' ? 'Player 1 Turn' : 'Your Turn';
        } else {
            turnIndicator.className = 'turn-indicator enemy-turn';
            turnLabel.textContent = this.gameMode === 'hotseat' ? 'Player 2 Turn' : 'Enemy Turn';
        }

        this.renderBoard();
        this.renderHand();
    }

    renderBoard() {
        const boardEl = $('#game-board');
        boardEl.innerHTML = '';

        for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
            for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                const tile = this.board[r][c];
                const tileEl = document.createElement('div');
                tileEl.className = 'board-tile';
                tileEl.dataset.row = r;
                tileEl.dataset.col = c;

                const territory = getTerritory(r);
                tileEl.classList.add(`${territory}-territory`);

                const currentOwner = this.currentTurn;

                if (this.selectedCard) {
                    if (this.canDeploy(currentOwner, r, c)) {
                        tileEl.classList.add('highlight-deploy');
                    }
                }

                if (this.selectedUnit) {
                    const { unit, row: ur, col: uc } = this.selectedUnit;
                    const dist = getDistance(ur, uc, r, c);

                    if (!tile.unit && dist <= unit.moveRange && !this.unitsActed.has(unit.instanceId)) {
                        tileEl.classList.add('highlight-move');
                    }

                    if (tile.unit && tile.unit.owner !== currentOwner && dist <= unit.attackRange) {
                        if ((unit.id !== 'archer' && unit.id !== 'pikeman') || hasLineOfSight(this.board, ur, uc, r, c)) {
                            tileEl.classList.add('highlight-attack');
                        }
                    }
                }

                const coords = document.createElement('span');
                coords.className = 'tile-coords';
                coords.textContent = CONSTANTS.COORDS[r][c];
                tileEl.appendChild(coords);

                if (tile.spaceCard) {
                    const overlay = document.createElement('div');
                    overlay.className = 'space-overlay';
                    overlay.textContent = tile.spaceCard.emoji;
                    tileEl.appendChild(overlay);
                }

                if (tile.unit) {
                    const unitEl = document.createElement('div');
                    unitEl.className = 'board-unit';

                    const sprite = document.createElement('div');
                    sprite.className = 'unit-sprite';
                    sprite.textContent = tile.unit.emoji;
                    unitEl.appendChild(sprite);

                    const maxHp = tile.unit.maxHealth || tile.unit.health;
                    const hpPercent = Math.max(0, (tile.unit.currentHealth / maxHp) * 100);
                    const healthBar = document.createElement('div');
                    healthBar.className = 'unit-health-bar';
                    const healthFill = document.createElement('div');
                    healthFill.className = 'unit-health-fill';
                    if (hpPercent <= 25) healthFill.classList.add('low');
                    else if (hpPercent <= 50) healthFill.classList.add('medium');
                    healthFill.style.width = hpPercent + '%';
                    healthBar.appendChild(healthFill);
                    unitEl.appendChild(healthBar);

                    const ownerInd = document.createElement('div');
                    ownerInd.className = `unit-owner-indicator ${tile.unit.owner}`;
                    unitEl.appendChild(ownerInd);

                    const effects = document.createElement('div');
                    effects.className = 'unit-effects';
                    if (this.stunnedUnits.has(tile.unit.instanceId)) {
                        effects.innerHTML += '<span class="effect-icon">💫</span>';
                    }
                    if (tile.unit.shield) {
                        effects.innerHTML += '<span class="effect-icon">🛡️</span>';
                    }
                    if (tile.unit.ragePotion) {
                        effects.innerHTML += '<span class="effect-icon">🧪</span>';
                    }
                    if (effects.children.length > 0) {
                        unitEl.appendChild(effects);
                    }

                    tileEl.appendChild(unitEl);
                }

                tileEl.addEventListener('click', () => this.clickTile(r, c));
                tileEl.addEventListener('mouseenter', () => this.hoverTile(r, c));

                boardEl.appendChild(tileEl);
            }
        }
    }

    renderHand() {
        const handEl = $('#player-hand');
        handEl.innerHTML = '';

        const currentHand = this.currentTurn === 'player' ? this.playerHand : this.enemyHand;
        const currentAP = this.currentTurn === 'player' ? this.playerAP : this.enemyAP;
        const currentDeck = this.currentTurn === 'player' ? this.playerDeck : this.enemyDeck;

        // Update panel header for hotseat
        const panelTitle = document.querySelector('#left-panel .panel-title');
        const deckCount = document.querySelector('#left-panel .deck-count');
        if (panelTitle) {
            panelTitle.textContent = this.gameMode === 'hotseat' 
                ? (this.currentTurn === 'player' ? "Player 1 Hand" : "Player 2 Hand")
                : "Your Hand";
        }
        if (deckCount) {
            deckCount.textContent = currentDeck.length;
        }

        currentHand.forEach((card, index) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'game-card';
            if (this.selectedCard && this.selectedCard.index === index) {
                cardEl.classList.add('selected');
            }
            if (card.apCost > currentAP) {
                cardEl.classList.add('disabled');
            }

            cardEl.innerHTML = `
                <div class="card-header">
                    <span class="card-name">${card.name}</span>
                    <span class="card-cost">${card.apCost} AP</span>
                </div>
                <div class="card-stats">
                    ${card.attack > 0 ? `<div class="card-stat"><span class="stat-icon">⚔️</span><span class="stat-value">${card.attack}</span></div>` : ''}
                    <div class="card-stat"><span class="stat-icon">❤️</span><span class="stat-value">${card.health}</span></div>
                    <div class="card-stat"><span class="stat-icon">📏</span><span class="stat-value">${card.attackRange}</span></div>
                    <div class="card-stat"><span class="stat-icon">👟</span><span class="stat-value">${card.moveRange}</span></div>
                </div>
                <div class="card-description">${card.ability}</div>
            `;

            cardEl.addEventListener('click', () => this.selectCard(index));
            handEl.appendChild(cardEl);
        });
    }

    hoverTile(row, col) {
        const tile = this.board[row][col];
        this.renderTileInfo(tile);
        if (tile.unit) {
            this.renderUnitInfo(tile.unit);
        }
    }

    renderTileInfo(tile) {
        const details = $('#tile-details');
        const territory = getTerritory(tile.row);
        const score = getTerritoryScore(tile.row, true);

        let territoryName = '';
        switch(territory) {
            case 'enemy_core': territoryName = 'Enemy Core'; break;
            case 'enemy_front': territoryName = 'Enemy Frontline'; break;
            case 'neutral': territoryName = 'Neutral'; break;
            case 'player_front': territoryName = 'Your Frontline'; break;
            case 'player_core': territoryName = 'Your Core'; break;
        }

        let html = `
            <div class="info-row"><span class="info-label">Position</span><span class="info-value">${tile.coords}</span></div>
            <div class="info-row"><span class="info-label">Territory</span><span class="info-value">${territoryName}</span></div>
            <div class="info-row"><span class="info-label">Score Value</span><span class="info-value">${score} pts</span></div>
        `;

        if (tile.spaceCard) {
            html += `<div class="info-row"><span class="info-label">Space Card</span><span class="info-value">${tile.spaceCard.name}</span></div>`;
        }

        details.innerHTML = html;
    }

    renderUnitInfo(unit) {
        const details = $('#unit-details');
        const maxHp = unit.maxHealth || unit.health;

        let html = `
            <div class="info-row"><span class="info-label">Name</span><span class="info-value">${unit.emoji} ${unit.name}</span></div>
            <div class="info-row"><span class="info-label">Health</span><span class="info-value">${unit.currentHealth}/${maxHp}</span></div>
            ${unit.attack > 0 ? `<div class="info-row"><span class="info-label">Attack</span><span class="info-value">${unit.attack}</span></div>` : ''}
            <div class="info-row"><span class="info-label">Move</span><span class="info-value">${unit.moveRange}</span></div>
            <div class="info-row"><span class="info-label">Range</span><span class="info-value">${unit.attackRange}</span></div>
        `;

        if (unit.buffs && unit.buffs.length > 0) {
            html += `<div class="info-row"><span class="info-label">Buffs</span><span class="info-value">${unit.buffs.join(', ')}</span></div>`;
        }

        html += `
            <div class="info-ability">
                <div class="info-ability-name">Ability</div>
                <div class="info-ability-desc">${unit.ability}</div>
            </div>
        `;

        details.innerHTML = html;
    }

    async endGame() {
        if (this.isGameOver) return;
        this.isGameOver = true;

        // Only add final territory scores if game ended naturally (all 10 rounds)
        // If king died mid-game, scores are already applied from resolution phase
        if (this.kingAlive.player && this.kingAlive.enemy) {
            const playerTerritoryScore = this.calculateTerritoryScore('player');
            const enemyTerritoryScore = this.calculateTerritoryScore('enemy');
            let multiplier = CONSTANTS.FINAL_ROUNDS.includes(this.round) ? CONSTANTS.SCORE_FINAL_MULTIPLIER : 1;
            this.playerScore += playerTerritoryScore * multiplier;
            this.enemyScore += enemyTerritoryScore * multiplier;
        }

        let winner = null;
        let tiebreaker = '';

        if (!this.kingAlive.player) {
            winner = 'enemy';
            tiebreaker = 'Player King was slain!';
        } else if (!this.kingAlive.enemy) {
            winner = 'player';
            tiebreaker = 'Enemy King was slain!';
        } else if (this.playerScore > this.enemyScore) {
            winner = 'player';
        } else if (this.enemyScore > this.playerScore) {
            winner = 'enemy';
        } else {
            const playerUnits = this.units.filter(u => u.owner === 'player').length;
            const enemyUnits = this.units.filter(u => u.owner === 'enemy').length;

            if (playerUnits > enemyUnits) {
                winner = 'player';
                tiebreaker = 'Tiebreaker: Most surviving troops';
            } else if (enemyUnits > playerUnits) {
                winner = 'enemy';
                tiebreaker = 'Tiebreaker: Most surviving troops';
            } else {
                const playerHealth = this.units.filter(u => u.owner === 'player').reduce((sum, u) => sum + u.currentHealth, 0);
                const enemyHealth = this.units.filter(u => u.owner === 'enemy').reduce((sum, u) => sum + u.currentHealth, 0);

                if (playerHealth > enemyHealth) {
                    winner = 'player';
                    tiebreaker = 'Tiebreaker: Highest total health';
                } else if (enemyHealth > playerHealth) {
                    winner = 'enemy';
                    tiebreaker = 'Tiebreaker: Highest total health';
                } else {
                    tiebreaker = 'Perfect tie!';
                }
            }
        }

        const resultEl = $('#game-result');
        if (winner === 'player') {
            resultEl.textContent = this.gameMode === 'hotseat' ? 'Player 1 Wins!' : 'Victory!';
            resultEl.className = 'victory';
        } else if (winner === 'enemy') {
            resultEl.textContent = this.gameMode === 'hotseat' ? 'Player 2 Wins!' : 'Defeat!';
            resultEl.className = 'defeat';
        } else {
            resultEl.textContent = 'Draw!';
            resultEl.className = '';
        }

        $('#final-player-score').textContent = this.playerScore;
        $('#final-enemy-score').textContent = this.enemyScore;
        $('#tiebreaker-info').textContent = tiebreaker;

        showOverlay('game-over');
    }
}
