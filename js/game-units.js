// ===== CROWNFALL TACTICS - UNIT RULES AND COMBAT =====

Object.assign(Game.prototype, {
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
,

  async deployUnit(owner, card, row, col) {
    const unit = {
      ...card, owner,
      currentHealth: card.health,
      hasMoved: false, hasAttacked: false,
      summonedThisTurn: true, buffs: []
    };
    // Store base stats for proper buff tracking
    unit.baseMaxHealth = card.maxHealth || card.health;
    unit.baseAttack = card.attack || 0;
    unit.kingHealthBonus = 0;
    unit.kingAttackBonus = 0;

    const tile = this.board[row][col];
    if (tile.spaceCard && tile.spaceCard.id === 'castle' && tile.spaceCard.activated && !tile.spaceCard.disabled) {
      unit.baseMaxHealth += 40;
      unit.maxHealth = unit.baseMaxHealth;
      unit.health = unit.maxHealth;
      unit.currentHealth = unit.maxHealth;
    }
    this.applyKingBuffs();
    this.board[row][col].unit = unit;
    this.units.push(unit);
    logAction(`${owner === 'player' ? 'Player 1' : 'Player 2'} deployed ${card.name} at ${CONSTANTS.COORDS[row][col]}`, owner);
    const tileEl = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (tileEl) { tileEl.classList.add('shake'); setTimeout(() => tileEl.classList.remove('shake'), 300); }
    this.renderBoard();
    await delay(200);
  }
,

  async moveUnit(unit, toRow, toCol) {
    const fromPos = this.findUnit(unit);
    if (!fromPos) return;
    const { row: fromRow, col: fromCol } = fromPos;
    this.board[toRow][toCol].unit = unit;
    this.board[fromRow][fromCol].unit = null;
    unit.hasMoved = true;

    logAction(`${unit.owner === 'player' ? 'Player 1' : 'Player 2'} moved ${unit.name} to ${CONSTANTS.COORDS[toRow][toCol]}`, unit.owner);
    this.applyKingBuffs();
    this.renderBoard();
    await delay(200);
  }
,

  async attackUnit(attacker, targetRow, targetCol) {
    const targetTile = this.board[targetRow][targetCol];
    if (!targetTile.unit) return;
    const target = targetTile.unit;
    let damage = attacker.attack || 0;
    const modifiers = [];

    // Apply temporary King attack buff
    if (attacker.kingAttackBonus > 0) {
      damage += attacker.kingAttackBonus;
      modifiers.push(`+${attacker.kingAttackBonus} King`);
    }

    if (attacker.id === 'knight' && attacker.hasMoved) {
      damage *= 2;
      modifiers.push('x2 Charge');
    }
    if (attacker.ragePotion) {
      damage *= 2;
      modifiers.push('x2 Rage');
      attacker.ragePotion = false;
    }
    if (target.volcanoEffect) {
      damage = Math.floor(damage * 1.5);
      modifiers.push('x1.5 Volcano');
    }

    const wasShielded = target.shield;
    if (target.shield) {
      damage = 0;
      target.shield = false;
      logAction(`🛡️ ${target.name}'s Shield blocked all damage!`, 'system');
    }

    target.currentHealth -= damage;
    attacker.hasAttacked = true;
    this.showDamage(targetRow, targetCol, damage);

    const modStr = modifiers.length > 0 ? ` [${modifiers.join(' | ')}]` : '';
    if (damage > 0) {
      logAction(`💥 ${attacker.name} dealt ${damage} to ${target.name}${modStr}`, attacker.owner);
    } else if (!wasShielded) {
      logAction(`💥 ${attacker.name} dealt 0 damage to ${target.name}`, attacker.owner);
    }

    if (target.currentHealth <= 0) {
      await this.killUnit(targetRow, targetCol);
    }
    this.renderBoard();
    await delay(300);
  }
,

  async useArchitectAbility(architect, targetRow, targetCol) {
    const tile = this.board[targetRow][targetCol];
    if (!tile.spaceCard || tile.spaceCard.owner === architect.owner) return;
    // Architect bypasses fog of war — can always target adjacent enemy space cards

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
,

  async usePopeConvert(pope, targetRow, targetCol) {
    const targetTile = this.board[targetRow][targetCol];
    if (!targetTile.unit) return;
    const target = targetTile.unit;
    const roll = Math.random();
    logAction(`✝️ Pope attempts conversion on ${target.name}...`, pope.owner);
    if (roll < CONSTANTS.POPE_CONVERT_CHANCE) {
      target.owner = pope.owner;
      this.convertedUnits.add(target.instanceId);
      this.stunnedUnits.add(target.instanceId);
      logAction(`✅ Conversion successful! ${target.name} joins ${pope.owner === 'player' ? 'Player 1' : 'Player 2'}!`, pope.owner);
      logAction(`💫 ${target.name} is stunned for 1 turn`, 'system');
    } else {
      logAction(`❌ Conversion failed on ${target.name} (rolled ${(roll * 100).toFixed(1)}%, needed ${(CONSTANTS.POPE_CONVERT_CHANCE * 100).toFixed(0)}%)`, 'system');
    }
    this.renderBoard();
    await delay(300);
  }
,

  async killUnit(row, col) {
    const tile = this.board[row][col];
    const unit = tile.unit;
    if (!unit) return;
    logAction(`${unit.name} was destroyed!`, 'system');

    if (unit.id === 'king') {
      if (unit.owner === 'player') {
        this.kingAlive.player = false;
        logAction('Player 1 King has fallen! GAME OVER!', 'system');
      } else {
        this.kingAlive.enemy = false;
        logAction('Player 2 King has fallen! GAME OVER!', 'system');
      }
      tile.unit = null;
      this.units = this.units.filter(u => u.instanceId !== unit.instanceId);
      this.applyKingBuffs(); // Recalculate buffs after king death
      this.renderBoard();
      this.updateUI();
      await delay(500);
      await this.endGame();
      return;
    }

    tile.unit = null;
    this.units = this.units.filter(u => u.instanceId !== unit.instanceId);
    this.applyKingBuffs(); // Recalculate buffs after unit death
    this.renderBoard();
    await delay(200);
  }
,

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
,

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
  },

  // ===== FIXED King Buff System =====
  // Buffs are recalculated each time based on current positions.
  // Units lose buffs when they or the King leave the buffed territory.

  applyKingBuffs() {
    const playerKing = this.findKing('player');
    const enemyKing = this.findKing('enemy');

    // Step 1: Reset all non-king units to base stats
    for (const unit of this.units) {
      if (unit.id === 'king') continue;
      // Revert maxHealth to base (removing any previous King health buff)
      const oldMax = unit.maxHealth;
      unit.maxHealth = unit.baseMaxHealth;
      // Cap currentHealth to new max (don't heal, just remove excess buffer)
      if (unit.currentHealth > unit.maxHealth) {
        unit.currentHealth = unit.maxHealth;
      }
      unit.health = unit.maxHealth;
      // Clear attack buff
      unit.kingAttackBonus = 0;
      // Clear buff display
      unit.buffs = [];
    }

    // Step 2: Apply Player 1 King buffs
    if (playerKing) {
      const kingTerritory = getTerritory(playerKing.row);
      const kingInEnemyTerritory = (kingTerritory === 'enemy_core' || kingTerritory === 'enemy_front');

      for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
        for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
          const unit = this.board[r][c].unit;
          if (!unit || unit.owner !== 'player' || unit.id === 'king') continue;

          const unitTerritory = getTerritory(r);
          const inOwnTerritory = (unitTerritory === 'player_core' || unitTerritory === 'player_front');
          const inEnemyTerritory = (unitTerritory === 'enemy_core' || unitTerritory === 'enemy_front');

          let healthBonus = 0;
          let attackBonus = 0;

          // Rule: Allied troops in own territory gain +15 max health
          if (inOwnTerritory) {
            healthBonus += 15;
            unit.buffs.push('+15 HP (own terr)');
          }

          // Rule: If King in enemy territory, allied troops in enemy territory gain +20 attack and +15 max health
          if (kingInEnemyTerritory && inEnemyTerritory) {
            healthBonus += 15;
            attackBonus += 20;
            unit.buffs.push('+15 HP (king in enemy)');
            unit.buffs.push('+20 ATK (king in enemy)');
          }

          // Apply health buff (no free healing — just increases max capacity)
          if (healthBonus > 0) {
            unit.maxHealth = unit.baseMaxHealth + healthBonus;
            // Keep currentHealth the same, just capped to new max
            unit.currentHealth = Math.min(unit.currentHealth, unit.maxHealth);
            unit.health = unit.maxHealth;
          }

          // Store attack buff for damage calculation
          unit.kingAttackBonus = attackBonus;
        }
      }
    }

    // Step 3: Apply Player 2 King buffs
    if (enemyKing) {
      const kingTerritory = getTerritory(enemyKing.row);
      const kingInEnemyTerritory = (kingTerritory === 'player_core' || kingTerritory === 'player_front');

      for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
        for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
          const unit = this.board[r][c].unit;
          if (!unit || unit.owner !== 'enemy' || unit.id === 'king') continue;

          const unitTerritory = getTerritory(r);
          const inOwnTerritory = (unitTerritory === 'enemy_core' || unitTerritory === 'enemy_front');
          const inEnemyTerritory = (unitTerritory === 'player_core' || unitTerritory === 'player_front');

          let healthBonus = 0;
          let attackBonus = 0;

          // Rule: Allied troops in own territory gain +15 max health
          if (inOwnTerritory) {
            healthBonus += 15;
            unit.buffs.push('+15 HP (own terr)');
          }

          // Rule: If King in enemy territory, allied troops in enemy territory gain +20 attack and +15 max health
          if (kingInEnemyTerritory && inEnemyTerritory) {
            healthBonus += 15;
            attackBonus += 20;
            unit.buffs.push('+15 HP (king in enemy)');
            unit.buffs.push('+20 ATK (king in enemy)');
          }

          // Apply health buff
          if (healthBonus > 0) {
            unit.maxHealth = unit.baseMaxHealth + healthBonus;
            unit.currentHealth = Math.min(unit.currentHealth, unit.maxHealth);
            unit.health = unit.maxHealth;
          }

          // Store attack buff
          unit.kingAttackBonus = attackBonus;
        }
      }
    }
  }

});
