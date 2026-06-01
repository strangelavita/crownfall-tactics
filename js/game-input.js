// ===== CROWNFALL TACTICS - PLAYER INPUT AND SPACE CARDS =====

Object.assign(Game.prototype, {
  selectCard(index) {
    if (this.phase !== CONSTANTS.PHASE.PLAYER_TURN && this.phase !== CONSTANTS.PHASE.ENEMY_TURN) return;
    const currentHand = this.currentTurn === 'player' ? this.playerHand : this.enemyHand;
    const currentAP = this.currentTurn === 'player' ? this.playerAP : this.enemyAP;
    const card = currentHand[index];
    if (!card || card.apCost > currentAP) return;
    this.selectedCard = { card, index };
    this.selectedUnit = null;
    this.selectedSpaceCard = null;
    this.updateSpaceActionPanel();
    this.renderBoard();
    this.renderHand();
  }
,

  selectUnit(row, col) {
    const tile = this.board[row][col];
    if (!tile.unit || tile.unit.owner !== this.currentTurn) return;
    if (this.stunnedUnits.has(tile.unit.instanceId)) {
      logAction(`${tile.unit.name} is stunned and cannot act!`, 'system');
      return;
    }
    this.selectedUnit = { unit: tile.unit, row, col };
    this.selectedCard = null;
    this.selectedSpaceCard = null;
    this.updateSpaceActionPanel();
    this.renderBoard();
    this.renderUnitInfo(tile.unit);
  }
,

  async clickTile(row, col) {
    if (this.phase !== CONSTANTS.PHASE.PLAYER_TURN && this.phase !== CONSTANTS.PHASE.ENEMY_TURN) return;
    if (this.isGameOver) return;

    const currentOwner = this.currentTurn;
    const tile = this.board[row][col];
    const currentAP = currentOwner === 'player' ? this.playerAP : this.enemyAP;

    // Deploy selected card
    if (this.selectedCard) {
      if (this.canDeploy(currentOwner, row, col)) {
        const card = this.selectedCard.card;
        const currentAP = currentOwner === 'player' ? this.playerAP : this.enemyAP;
        if (currentAP < card.apCost) {
          logAction(`❌ Not enough AP! Need ${card.apCost}, have ${currentAP}`, 'system');
          this.selectedCard = null;
          this.renderBoard();
          return;
        }
        await this.deployUnit(currentOwner, card, row, col);
        if (currentOwner === 'player') {
          this.playerHand.splice(this.selectedCard.index, 1);
          this.playerAP -= card.apCost;
          logAction(`📦 Player 1 deployed ${card.name} at ${CONSTANTS.COORDS[row][col]} (-${card.apCost} AP → ${this.playerAP} left)`, 'player');
        } else {
          this.enemyHand.splice(this.selectedCard.index, 1);
          this.enemyAP -= card.apCost;
          logAction(`📦 Player 2 deployed ${card.name} at ${CONSTANTS.COORDS[row][col]} (-${card.apCost} AP → ${this.enemyAP} left)`, 'enemy');
        }
        this.selectedCard = null;
        this.selectedSpaceCard = null;
        this.updateSpaceActionPanel();
        this.updateUI();
      } else {
        this.selectedCard = null;
        this.renderBoard();
      }
      return;
    }

    // Action with selected unit
    if (this.selectedUnit) {
      const { unit, row: fromRow, col: fromCol } = this.selectedUnit;
      const dist = getDistance(fromRow, fromCol, row, col);
      const currentAP = currentOwner === 'player' ? this.playerAP : this.enemyAP;

      // Stunned check
      if (this.stunnedUnits.has(unit.instanceId)) {
        logAction(`💫 ${unit.name} is stunned and cannot act!`, 'system');
        this.selectedUnit = null;
        this.renderBoard();
        return;
      }

      // ── ARCHITECT ABILITY (check BEFORE move) ──
      if (unit.id === 'architect' && dist <= 1 && !this.unitsActed.has(unit.instanceId)) {
        const targetTile = this.board[row][col];
        // Architect can always see adjacent enemy space cards (bypass visibility fog)
        if (targetTile.spaceCard && targetTile.spaceCard.owner !== currentOwner) {
          if (currentAP < 1) {
            logAction(`❌ Not enough AP for Architect ability! Need 1, have ${currentAP}`, 'system');
            this.selectedUnit = null;
            this.renderBoard();
            return;
          }
          const sc = targetTile.spaceCard;
          if (sc.type === 'one-time' && !sc.used) {
            targetTile.spaceCard = null;
            this.unitsActed.add(unit.instanceId);
            if (currentOwner === 'player') {
              this.playerAP -= 1;
              logAction(`🔨 Player 1 Architect destroyed ${sc.name}! (-1 AP → ${this.playerAP} left)`, 'player');
            } else {
              this.enemyAP -= 1;
              logAction(`🔨 Player 2 Architect destroyed ${sc.name}! (-1 AP → ${this.enemyAP} left)`, 'enemy');
            }
            this.selectedUnit = null;
            this.updateUI();
            return;
          } else if (sc.type === 'permanent') {
            sc.disabled = true;
            sc.disabledRounds = 2;
            this.unitsActed.add(unit.instanceId);
            if (currentOwner === 'player') {
              this.playerAP -= 1;
              logAction(`🔨 Player 1 Architect disabled ${sc.name} for 2 rounds! (-1 AP → ${this.playerAP} left)`, 'player');
            } else {
              this.enemyAP -= 1;
              logAction(`🔨 Player 2 Architect disabled ${sc.name} for 2 rounds! (-1 AP → ${this.enemyAP} left)`, 'enemy');
            }
            this.selectedUnit = null;
            this.updateUI();
            return;
          }
        }
      }

      // ── MOVE ──
      if (!tile.unit && dist <= unit.moveRange) {
        const canMove = unit.id === 'knight' ? !unit.hasMoved : !this.unitsActed.has(unit.instanceId);
        if (!canMove) {
          logAction(`⚠️ ${unit.name} has already moved this turn`, 'system');
          this.selectedUnit = null;
          this.renderBoard();
          return;
        }
        if (unit.volcanoEffect) {
          logAction(`🌋 ${unit.name} cannot move — Volcano effect active`, 'system');
          this.selectedUnit = null;
          this.renderBoard();
          return;
        }
        if (currentAP < 1) {
          logAction(`❌ Not enough AP to move! Need 1, have ${currentAP}`, 'system');
          this.selectedUnit = null;
          this.renderBoard();
          return;
        }
        await this.moveUnit(unit, row, col);
        if (unit.id === 'knight') {
          unit.hasMoved = true;
        } else {
          this.unitsActed.add(unit.instanceId);
        }
        if (currentOwner === 'player') {
          this.playerAP -= 1;
          logAction(`🚶 Player 1 moved ${unit.name} to ${CONSTANTS.COORDS[row][col]} (-1 AP → ${this.playerAP} left)`, 'player');
        } else {
          this.enemyAP -= 1;
          logAction(`🚶 Player 2 moved ${unit.name} to ${CONSTANTS.COORDS[row][col]} (-1 AP → ${this.enemyAP} left)`, 'enemy');
        }
        if (unit.id === 'knight') {
          logAction(`⚔️ ${unit.name} is charged — next attack deals double damage!`, unit.owner);
        }
        this.selectedUnit = null;
        this.updateUI();
        return;
      }

      // ── ATTACK ──
      if (tile.unit && tile.unit.owner !== currentOwner && dist <= unit.attackRange && unit.attack > 0) {
        if (unit.id === 'archer' && !isStraightLineAttack(fromRow, fromCol, row, col)) {
          logAction(`🏹 ${unit.name} can only attack in straight lines!`, 'system');
          this.selectedUnit = null;
          this.renderBoard();
          return;
        }
        if (unit.id === 'pikeman' && !hasLineOfSight(this.board, fromRow, fromCol, row, col)) {
          logAction(`🔱 ${unit.name} requires a clear straight line!`, 'system');
          this.selectedUnit = null;
          this.renderBoard();
          return;
        }
        const canAttack = unit.id === 'knight' ? !unit.hasAttacked : !this.unitsActed.has(unit.instanceId);
        if (!canAttack) {
          logAction(`⚠️ ${unit.name} has already acted this turn`, 'system');
          this.selectedUnit = null;
          this.renderBoard();
          return;
        }
        if (currentAP < 1) {
          logAction(`❌ Not enough AP to attack! Need 1, have ${currentAP}`, 'system');
          this.selectedUnit = null;
          this.renderBoard();
          return;
        }
        await this.attackUnit(unit, row, col);
        if (unit.id === 'knight') {
          unit.hasAttacked = true;
          this.unitsActed.add(unit.instanceId);
        } else {
          this.unitsActed.add(unit.instanceId);
        }
        if (currentOwner === 'player') {
          this.playerAP -= 1;
          logAction(`⚔️ Player 1 ${unit.name} attacked ${tile.unit.name} (-1 AP → ${this.playerAP} left)`, 'player');
        } else {
          this.enemyAP -= 1;
          logAction(`⚔️ Player 2 ${unit.name} attacked ${tile.unit.name} (-1 AP → ${this.enemyAP} left)`, 'enemy');
        }
        this.selectedUnit = null;
        this.updateUI();
        return;
      }

      // ── POPE CONVERT ──
      if (unit.id === 'pope' && tile.unit && tile.unit.owner !== currentOwner && dist <= 1) {
        if (this.unitsActed.has(unit.instanceId)) {
          logAction(`⚠️ ${unit.name} has already acted this turn`, 'system');
          this.selectedUnit = null;
          this.renderBoard();
          return;
        }
        const cd = currentOwner === 'player' ? this.popeCooldowns.player : this.popeCooldowns.enemy;
        if (cd > 0) {
          logAction(`⏳ Pope on cooldown — ${cd} round${cd > 1 ? 's' : ''} remaining`, 'system');
          this.selectedUnit = null;
          this.renderBoard();
          return;
        }
        if (tile.unit.id === 'king' || tile.unit.id === 'knight') {
          logAction(`🚫 Cannot convert ${tile.unit.id === 'king' ? 'King' : 'Knight'}!`, 'system');
          this.selectedUnit = null;
          this.renderBoard();
          return;
        }
        const targetAPCost = tile.unit.apCost;
        if (currentAP < targetAPCost) {
          logAction(`❌ Not enough AP! Convert costs ${targetAPCost} AP (target's cost), have ${currentAP}`, 'system');
          this.selectedUnit = null;
          this.renderBoard();
          return;
        }
        await this.usePopeConvert(unit, row, col);
        if (currentOwner === 'player') {
          this.popeCooldowns.player = CONSTANTS.POPE_COOLDOWN;
          this.playerAP -= targetAPCost;
          logAction(`✝️ Player 1 Pope used Convert on ${tile.unit.name} (-${targetAPCost} AP → ${this.playerAP} left)`, 'player');
        } else {
          this.popeCooldowns.enemy = CONSTANTS.POPE_COOLDOWN;
          this.enemyAP -= targetAPCost;
          logAction(`✝️ Player 2 Pope used Convert on ${tile.unit.name} (-${targetAPCost} AP → ${this.enemyAP} left)`, 'enemy');
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

    // Select a space card and show the deliberate activation option.
    if (tile.spaceCard && tile.spaceCard.owner === currentOwner) {
      this.selectSpaceCard(row, col);
      return;
    }

    // Select unit on tile
    if (tile.unit && tile.unit.owner === currentOwner) {
      this.selectUnit(row, col);
      return;
    }

    this.selectedSpaceCard = null;
    this.updateSpaceActionPanel();
    this.renderBoard();
  }
,

  selectSpaceCard(row, col) {
    const tile = this.board[row][col];
    if (!tile.spaceCard || tile.spaceCard.owner !== this.currentTurn) return;
    this.selectedSpaceCard = { card: tile.spaceCard, row, col };
    this.selectedCard = null;
    this.selectedUnit = null;
    this.renderBoard();
    this.renderTileInfo(tile);
    if (tile.unit) this.renderUnitInfo(tile.unit);
    this.updateSpaceActionPanel();
  }
,

  canActivateSpaceCard(row, col) {
    const tile = this.board[row][col];
    const sc = tile.spaceCard;
    const currentAP = this.currentTurn === 'player' ? this.playerAP : this.enemyAP;
    if (!sc || sc.owner !== this.currentTurn) return false;
    if (sc.disabled || sc.used || sc.activated || currentAP < 1) return false;
    if (sc.id === 'tower') return true;
    if (!tile.unit) return false;
    if (sc.id === 'volcano') return true;
    return tile.unit.owner === this.currentTurn;
  }
,

  async activateSelectedSpaceCard() {
    if (!this.selectedSpaceCard) return;
    const { row, col } = this.selectedSpaceCard;
    if (!this.canActivateSpaceCard(row, col)) {
      logAction('That space card cannot be activated right now.', 'system');
      this.updateSpaceActionPanel();
      return;
    }

    const sc = this.board[row][col].spaceCard;
    const unit = this.board[row][col].unit;
    await this.activateSpaceCard(row, col);
    if (this.currentTurn === 'player') {
      this.playerAP -= 1;
      logAction(`🏛️ Player 1 activated ${sc.name}${unit ? ` on ${unit.name}` : ''} (-1 AP → ${this.playerAP} left)`, 'player');
    } else {
      this.enemyAP -= 1;
      logAction(`🏛️ Player 2 activated ${sc.name}${unit ? ` on ${unit.name}` : ''} (-1 AP → ${this.enemyAP} left)`, 'enemy');
    }
    this.selectedSpaceCard = null;
    this.updateUI();
    this.updateSpaceActionPanel();
  }
,

  async activateSpaceCard(row, col) {
    const tile = this.board[row][col];
    const sc = tile.spaceCard;
    const unit = tile.unit;
    if (!sc) return;
    if (sc.id !== 'tower' && !unit) return;
    if (sc.id !== 'tower' && sc.id !== 'volcano' && unit.owner !== sc.owner) return;

    if (sc.id === 'castle') {
      unit.maxHealth = (unit.maxHealth || unit.health) + 40;
      unit.health = unit.maxHealth;
      unit.currentHealth = Math.min((unit.currentHealth || unit.health) + 40, unit.maxHealth);
      sc.activated = true;
      logAction(`${sc.name} fortified ${unit.name} with +40 max health.`, sc.owner);
    } else if (sc.id === 'tower') {
      sc.activated = true;
      logAction(`${sc.name} is activated and will fire at the start of your turns.`, sc.owner);
    } else if (sc.id === 'volcano') {
      unit.volcanoEffect = true;
      sc.used = true;
      logAction(`${sc.name} erupted under ${unit.name}. They cannot move this turn and take +50% damage.`, sc.owner);
    } else if (sc.id === 'shield') {
      unit.shield = true;
      sc.used = true;
      logAction(`${unit.name} gained a Shield from ${sc.name}.`, sc.owner);
    } else if (sc.id === 'rage_potion') {
      unit.ragePotion = true;
      sc.used = true;
      logAction(`${unit.name} gained Rage Potion. Next attack deals 200% damage.`, sc.owner);
    } else if (sc.id === 'health_potion') {
      const oldHp = unit.currentHealth;
      unit.currentHealth = unit.maxHealth || unit.health;
      sc.used = true;
      logAction(`${unit.name} used Health Potion and restored ${unit.currentHealth - oldHp} HP.`, sc.owner);
      const tileEl = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      if (tileEl) {
        const rect = tileEl.getBoundingClientRect();
        showFloatingText(`+${unit.currentHealth - oldHp}`, rect.left + rect.width / 2, rect.top, 'heal');
      }
    }

    this.renderBoard();
    await delay(200);
  }

});
