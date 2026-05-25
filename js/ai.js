// ===== CROWNFALL TACTICS - AI SYSTEM =====

class AI {
    constructor(game, difficulty = 'normal') {
        this.game = game;
        this.difficulty = difficulty;
    }

    getActions() {
        const actions = [];
        let ap = this.game.enemyAP;

        // Get all possible actions
        const deployActions = this.getDeployActions();
        const moveActions = this.getMoveActions();
        const attackActions = this.getAttackActions();
        const abilityActions = this.getAbilityActions();
        const spaceActions = this.getSpaceCardActions();

        // Score and sort actions
        const scoredDeploys = deployActions.map(a => ({ ...a, score: this.scoreDeploy(a) }));
        const scoredMoves = moveActions.map(a => ({ ...a, score: this.scoreMove(a) }));
        const scoredAttacks = attackActions.map(a => ({ ...a, score: this.scoreAttack(a) }));
        const scoredAbilities = abilityActions.map(a => ({ ...a, score: this.scoreAbility(a) }));
        const scoredSpaces = spaceActions.map(a => ({ ...a, score: this.scoreSpaceCard(a) }));

        // Sort by score descending
        scoredDeploys.sort((a, b) => b.score - a.score);
        scoredMoves.sort((a, b) => b.score - a.score);
        scoredAttacks.sort((a, b) => b.score - a.score);
        scoredAbilities.sort((a, b) => b.score - a.score);
        scoredSpaces.sort((a, b) => b.score - a.score);

        // Execute best actions until AP runs out
        const actedUnits = new Set();

        while (ap > 0) {
            let bestAction = null;
            let bestScore = -Infinity;

            // Consider attacks first (high priority)
            for (const action of scoredAttacks) {
                if (1 <= ap && !actedUnits.has(action.unit.instanceId)) {
                    if (action.score > bestScore) {
                        bestScore = action.score;
                        bestAction = action;
                    }
                }
            }

            // Consider abilities
            for (const action of scoredAbilities) {
                const abilityCost = action.apCost || 1;
                if (abilityCost <= ap && !actedUnits.has(action.unit.instanceId)) {
                    if (action.score > bestScore) {
                        bestScore = action.score;
                        bestAction = action;
                    }
                }
            }

            // Consider deliberate space-card activation
            for (const action of scoredSpaces) {
                if (action.apCost <= ap) {
                    if (action.score > bestScore) {
                        bestScore = action.score;
                        bestAction = action;
                    }
                }
            }

            // Consider moves
            for (const action of scoredMoves) {
                if (1 <= ap && !actedUnits.has(action.unit.instanceId) && !actedUnits.has(`${action.unit.instanceId}_attacked`)) {
                    if (action.score > bestScore) {
                        bestScore = action.score;
                        bestAction = action;
                    }
                }
            }

            // Consider deploys
            for (const action of scoredDeploys) {
                if (action.card.apCost <= ap) {
                    if (action.score > bestScore) {
                        bestScore = action.score;
                        bestAction = action;
                    }
                }
            }

            if (!bestAction || bestScore < 0) break;

            actions.push(bestAction);

            if (bestAction.type === 'deploy') {
                ap -= bestAction.card.apCost;
                // Remove card from hand
                const idx = this.game.enemyHand.indexOf(bestAction.card);
                if (idx > -1) this.game.enemyHand.splice(idx, 1);
            } else if (bestAction.type === 'attack') {
                ap -= 1;
                if (bestAction.unit.id === 'knight') {
                    actedUnits.add(`${bestAction.unit.instanceId}_attacked`);
                } else {
                    actedUnits.add(bestAction.unit.instanceId);
                }
            } else if (bestAction.type === 'move') {
                ap -= 1;
                actedUnits.add(bestAction.unit.instanceId);
            } else if (bestAction.type === 'ability') {
                ap -= bestAction.apCost || 1;
                actedUnits.add(bestAction.unit.instanceId);
            } else if (bestAction.type === 'space') {
                ap -= bestAction.apCost || 1;
                bestAction.card.activated = true;
            }
        }

        return actions;
    }

    getDeployActions() {
        const actions = [];
        const tiles = getValidDeployTiles(this.game.board, false);

        for (const card of this.game.enemyHand) {
            for (const tile of tiles) {
                actions.push({
                    type: 'deploy',
                    card,
                    row: tile.row,
                    col: tile.col
                });
            }
        }

        return actions;
    }

    getMoveActions() {
        const actions = [];
        for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
            for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                const unit = this.game.board[r][c].unit;
                if (unit && unit.owner === 'enemy') {
                    if (this.game.stunnedUnits.has(unit.instanceId)) continue;
                    const canMove = unit.id === 'knight'
                        ? !unit.hasMoved
                        : !this.game.unitsActed.has(unit.instanceId);
                    if (canMove) {
                        const moves = getValidMoves(this.game.board, unit, r, c);
                        for (const move of moves) {
                            actions.push({
                                type: 'move',
                                unit,
                                fromRow: r,
                                fromCol: c,
                                toRow: move.row,
                                toCol: move.col
                            });
                        }
                    }
                }
            }
        }
        return actions;
    }

    getAttackActions() {
        const actions = [];

        for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
            for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                const unit = this.game.board[r][c].unit;
                if (unit && unit.owner === 'enemy' && unit.attack > 0) {
                    if (this.game.stunnedUnits.has(unit.instanceId)) continue;
                    const canAttack = unit.id === 'knight'
                        ? !unit.hasAttacked
                        : !this.game.unitsActed.has(unit.instanceId);
                    if (canAttack) {
                        const attacks = getValidAttacks(this.game.board, unit, r, c, 'enemy');
                        for (const attack of attacks) {
                            actions.push({
                                type: 'attack',
                                unit,
                                fromRow: r,
                                fromCol: c,
                                targetRow: attack.row,
                                targetCol: attack.col,
                                target: attack.target
                            });
                        }
                    }
                }
            }
        }

        return actions;
    }

    getAbilityActions() {
        const actions = [];
        for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
            for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                const unit = this.game.board[r][c].unit;
                if (!unit || unit.owner !== 'enemy') continue;
                if (this.game.stunnedUnits.has(unit.instanceId)) continue;

                // Pope convert
                if (unit.id === 'pope') {
                    if (this.game.popeCooldowns.enemy > 0) continue;
                    if (this.game.unitsActed.has(unit.instanceId)) continue;

                    const adjacent = getAdjacentTiles(r, c);
                    for (const adj of adjacent) {
                        const adjUnit = this.game.board[adj.row][adj.col].unit;
                        if (adjUnit && adjUnit.owner === 'player' &&
                            adjUnit.id !== 'king' && adjUnit.id !== 'knight') {
                            actions.push({
                                type: 'ability',
                                ability: 'convert',
                                unit,
                                targetRow: adj.row,
                                targetCol: adj.col,
                                apCost: adjUnit.apCost
                            });
                        }
                    }
                }

                // Architect disable/destroy
                if (unit.id === 'architect') {
                    if (this.game.unitsActed.has(unit.instanceId)) continue;

                    const adjacent = getAdjacentTiles(r, c);
                    for (const adj of adjacent) {
                        const adjTile = this.game.board[adj.row][adj.col];
                        if (adjTile.spaceCard && adjTile.spaceCard.owner === 'player' && !adjTile.spaceCard.disabled &&
                            this.game.isSpaceCardVisibleTo(adjTile.spaceCard, 'enemy')) {
                            actions.push({
                                type: 'ability',
                                ability: 'architect',
                                unit,
                                targetRow: adj.row,
                                targetCol: adj.col,
                                apCost: 1
                            });
                        }
                    }
                }
            }
        }
        return actions;
    }

    getSpaceCardActions() {
        const actions = [];

        for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
            for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                const tile = this.game.board[r][c];
                const sc = tile.spaceCard;
                if (!sc || sc.owner !== 'enemy' || sc.disabled || sc.used || sc.activated) continue;
                if (sc.id !== 'tower' && !tile.unit) continue;
                if (sc.id !== 'tower' && sc.id !== 'volcano' && tile.unit.owner !== 'enemy') continue;

                actions.push({
                    type: 'space',
                    card: sc,
                    row: r,
                    col: c,
                    unit: tile.unit,
                    apCost: 1
                });
            }
        }

        return actions;
    }

    // ===== SCORING =====

    scoreDeploy(action) {
        let score = 0;
        const { card, row, col } = action;

        // Territory value
        const territory = getTerritory(row);
        if (territory === 'enemy_front') score += 10;
        else if (territory === 'neutral') score += 30;
        else if (territory === 'player_front') score += 50;
        else if (territory === 'player_core') score += 40;

        // Unit value
        if (card.id === 'king') score += 100;
        else if (card.id === 'knight') score += 40;
        else if (card.id === 'archer') score += 30;
        else if (card.id === 'pikeman') score += 25;
        else if (card.id === 'swordsman') score += 20;
        else if (card.id === 'pope') score += 15;
        else if (card.id === 'architect') score += 10;

        // Late game aggression
        if (this.game.round >= 7) {
            score += (4 - row) * 5; // Prefer forward positions
        }

        // Protect king
        const king = this.game.findKing('enemy');
        if (king && card.id !== 'king') {
            const distToKing = getDistance(row, col, king.row, king.col);
            if (distToKing <= 1) score += 20;
        }

        // Difficulty adjustments
        if (this.difficulty === 'easy') score *= 0.7;
        else if (this.difficulty === 'hard') score *= 1.3;

        return score;
    }

    scoreMove(action) {
        let score = 0;
        const { unit, toRow, toCol } = action;

        // Territory control
        const territory = getTerritory(toRow);
        if (territory === 'player_core') score += 50;
        else if (territory === 'player_front') score += 40;
        else if (territory === 'neutral') score += 30;
        else if (territory === 'enemy_front') score += 10;

        // Proximity to enemy king (attack priority)
        const enemyKing = this.game.findKing('player');
        if (enemyKing) {
            const dist = getDistance(toRow, toCol, enemyKing.row, enemyKing.col);
            score += (5 - dist) * 15;
            // Extra bonus for being able to attack king
            if (dist <= unit.attackRange) score += 100;
        }

        // PROTECT OWN KING - high priority
        const ownKing = this.game.findKing('enemy');
        if (ownKing) {
            const distToKing = getDistance(toRow, toCol, ownKing.row, ownKing.col);
            if (unit.id === 'king') {
                // King should move toward enemy territory late game, stay safe early
                if (this.game.round < 5) {
                    if (toRow <= 1) score += 50; // Stay in own territory early
                } else {
                    score += (4 - toRow) * 10; // Push forward late game
                }
            } else {
                // Bodyguard behavior - stay near king
                if (distToKing <= 1) score += 40;
                else if (distToKing <= 2) score += 20;

                // Intercept enemies approaching king
                for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
                    for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                        const enemy = this.game.board[r][c].unit;
                        if (enemy && enemy.owner === 'player') {
                            const enemyDistToKing = getDistance(r, c, ownKing.row, ownKing.col);
                            const myDistToEnemy = getDistance(toRow, toCol, r, c);
                            if (enemyDistToKing <= 2 && myDistToEnemy <= unit.attackRange) {
                                score += 60; // High priority to intercept threats
                            }
                        }
                    }
                }
            }
        }

        // Avoid danger
        for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
            for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
                const enemy = this.game.board[r][c].unit;
                if (enemy && enemy.owner === 'player') {
                    const dist = getDistance(toRow, toCol, r, c);
                    if (dist <= enemy.attackRange) {
                        score -= 15;
                        if (unit.id === 'king') score -= 50; // King extra danger avoidance
                    }
                }
            }
        }

        // Late game push
        if (this.game.round >= 7) {
            score += (4 - toRow) * 8;
        }

        // Difficulty
        if (this.difficulty === 'easy') score *= 0.7;
        else if (this.difficulty === 'hard') score *= 1.3;

        return score;
    }

    scoreAttack(action) {
        let score = 0;
        const { unit, target } = action;

        if (!target) return -100;

        // Target value
        if (target.id === 'king') score += 200;
        else if (target.id === 'pope') score += 80;
        else if (target.id === 'archer') score += 60;
        else if (target.id === 'knight') score += 50;
        else if (target.id === 'pikeman') score += 40;
        else if (target.id === 'swordsman') score += 30;
        else if (target.id === 'architect') score += 20;

        // Can kill?
        let damage = unit.attack || 0;
        if (target.currentHealth <= damage) {
            score += 100; // Kill bonus
        }

        // Damage efficiency
        score += damage * 2;

        // Counter-attack risk
        const pos = this.game.findUnit(unit);
        if (pos) {
            const dist = getDistance(pos.row, pos.col, action.targetRow, action.targetCol);
            if (dist <= target.attackRange) {
                score -= 20; // Risk of counter-attack
            }
        }

        // Difficulty
        if (this.difficulty === 'easy') {
            score *= 0.6;
            if (target.id === 'king') score = -50; // Easy AI avoids king
        } else if (this.difficulty === 'hard') {
            score *= 1.4;
        }

        return score;
    }

    scoreAbility(action) {
        let score = 0;
        const { ability, targetRow, targetCol } = action;

        if (ability === 'convert') {
            const target = this.game.board[targetRow][targetCol].unit;
            if (target) {
                score = target.attack * 5 + target.currentHealth;
                if (target.id === 'archer') score += 50;
                if (target.id === 'pikeman') score += 40;
            }
        } else if (ability === 'architect') {
            const target = this.game.board[targetRow][targetCol].spaceCard;
            if (target) {
                if (target.type === 'one-time') score = 30;
                else score = 50; // Permanent cards are more valuable to disable
                if (target.id === 'tower') score += 20;
                if (target.id === 'castle') score += 15;
            }
        }

        if (this.difficulty === 'easy') score *= 0.5;
        else if (this.difficulty === 'hard') score *= 1.3;

        return score;
    }

    scoreSpaceCard(action) {
        const { card, unit } = action;
        if (card.id === 'tower') return 45;
        if (!unit) return -100;

        if (card.id === 'health_potion') {
            const maxHp = unit.maxHealth || unit.health;
            return Math.max(0, maxHp - unit.currentHealth);
        }
        if (card.id === 'shield') return unit.owner === 'enemy' ? 35 : 10;
        if (card.id === 'rage_potion') return unit.owner === 'enemy' && unit.attack > 0 ? 40 + unit.attack : 5;
        if (card.id === 'castle') return unit.owner === 'enemy' ? 50 : 5;
        if (card.id === 'volcano') return unit.owner === 'player' ? 55 : 0;
        return 0;
    }
}
