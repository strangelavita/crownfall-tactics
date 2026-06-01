// ===== CROWNFALL TACTICS - TURN FLOW AND SCORING =====

Object.assign(Game.prototype, {
  startMatch() {
    this.round = 1; this.playerScore = 0; this.enemyScore = 0;
    this.phase = CONSTANTS.PHASE.DRAW; this.currentTurn = 'player';
    this.finalRoundScored = false;
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
,

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
,

  async startRound() {
    logAction(`=== Round ${this.round} ===`, 'system');
    this.phase = CONSTANTS.PHASE.DRAW;
    await this.drawPhase();
    this.phase = CONSTANTS.PHASE.PLAYER_TURN;
    this.currentTurn = 'player';
    this.playerAP = this.getAPForRound();
    this.unitsActed.clear();
    for (const unit of this.units) {
      unit.hasMoved = false;
      unit.hasAttacked = false;
    }
    await this.applyTowerDamage('player');
    this.updateUI();
    if (this.isDoubleAPRound()) {
      logAction(`Double AP round! Players get ${this.playerAP} AP this round.`, 'system');
    }
    logAction(`▶ Player 1 turn begins — ${this.playerAP} AP available`, 'player');
  }
,

  async drawPhase() {
    if (!this.drawEachRound) {
      await delay(100);
      return;
    }

    const playerCard = this.drawCard('player');
    const enemyCard = this.drawCard('enemy');
    await delay(300);
  }
,

  async endPlayerTurn() {
    if (this.currentTurn !== 'player') return;
    if (this.playerAP > 0) {
      logAction(`⏹️ Player 1 ended turn — ${this.playerAP} AP unused`, 'system');
    } else {
      logAction(`⏹️ Player 1 ended turn`, 'system');
    }
    this.selectedCard = null;
    this.selectedUnit = null;
    this.selectedSpaceCard = null;
    this.clearVolcanoEffects('player');
    this.currentTurn = 'enemy';
    this.phase = CONSTANTS.PHASE.ENEMY_TURN;
    this.enemyAP = this.getAPForRound();
    this.unitsActed.clear();
    for (const unit of this.units) {
      unit.hasMoved = false;
      unit.hasAttacked = false;
    }
    this.updateUI();
    logAction(`▶ Player 2 turn begins — ${this.enemyAP} AP available`, 'enemy');
    await this.applyTowerDamage('enemy');
  }
,

  async endEnemyTurn() {
    if (this.isGameOver) return;
    if (this.enemyAP > 0) {
      logAction(`⏹️ Player 2 ended turn — ${this.enemyAP} unused AP`, 'system');
    } else {
      logAction(`⏹️ Player 2 ended turn`, 'system');
    }
    this.selectedCard = null;
    this.selectedUnit = null;
    this.selectedSpaceCard = null;
    this.clearVolcanoEffects('enemy');
    this.phase = CONSTANTS.PHASE.RESOLUTION;
    await this.resolutionPhase();
    if (this.round >= this.totalRounds) {
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
,

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
    if (this.isDoubleScoreRound()) {
      multiplier = CONSTANTS.SCORE_FINAL_MULTIPLIER;
      logAction(`Double score round! Scoring x${multiplier}`, 'system');
    }
    this.playerScore += playerTerritoryScore * multiplier;
    this.enemyScore += enemyTerritoryScore * multiplier;
    if (this.round >= this.totalRounds) {
      this.finalRoundScored = true;
    }
    logAction(`Player 1 scored ${playerTerritoryScore * multiplier} points`, 'player');
    logAction(`Player 2 scored ${enemyTerritoryScore * multiplier} points`, 'enemy');
    this.updateUI();
    await delay(800);
  }
,

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
,

  async applyTowerDamage(turnOwner) {
    for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
      for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
        const tile = this.board[r][c];
        if (tile.spaceCard && tile.spaceCard.id === 'tower' && tile.spaceCard.owner === turnOwner && tile.spaceCard.activated && !tile.spaceCard.disabled) {
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
,

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
,

  clearVolcanoEffects(owner) {
    for (const unit of this.units) {
      if (unit.owner === owner) {
        unit.volcanoEffect = false;
      }
    }
  }
,

  isSpaceCardVisibleTo(spaceCard, viewer) {
    return !!spaceCard && (spaceCard.owner === viewer || spaceCard.activated || spaceCard.used);
  }
,

  getViewerOwner() {
    return this.currentTurn;
  }

});
