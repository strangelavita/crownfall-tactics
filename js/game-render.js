// ===== CROWNFALL TACTICS - RENDERING =====

Object.assign(Game.prototype, {
  showDamage(row, col, damage) {
    const tile = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (tile) {
      const rect = tile.getBoundingClientRect();
      showFloatingText(`-${damage}`, rect.left + rect.width / 2, rect.top, 'damage');
    }
  }
,

  updateUI() {
    $('#round-number').textContent = this.round;
    const roundTotal = $('#round-total');
    if (roundTotal) roundTotal.textContent = `/ ${this.totalRounds}`;
    $('#ap-value').textContent = this.currentTurn === 'player' ? this.playerAP : this.enemyAP;
    const apTotal = $('.ap-total');
    if (apTotal) apTotal.textContent = `/ ${this.getAPForRound()}`;
    $('#player-score').textContent = this.playerScore;
    $('#enemy-score').textContent = this.enemyScore;
    $('#deck-count').textContent = `Deck ${this.currentTurn === 'player' ? this.playerDeck.length : this.enemyDeck.length}`;
    $('#hand-count').textContent = `Hand ${this.currentTurn === 'player' ? this.playerHand.length : this.enemyHand.length}`;

    // Update score labels for 2-player
    const playerLabel = $('#player-label');
    const enemyLabel = $('#enemy-label');
    if (playerLabel) playerLabel.textContent = 'P1';
    if (enemyLabel) enemyLabel.textContent = 'P2';

    const turnIndicator = $('#turn-indicator');
    const turnLabel = turnIndicator.querySelector('.turn-label');

    if (this.currentTurn === 'player') {
      turnIndicator.className = 'turn-indicator player-turn';
      turnLabel.textContent = 'Player 1 Turn';
    } else {
      turnIndicator.className = 'turn-indicator enemy-turn';
      turnLabel.textContent = 'Player 2 Turn';
    }

    this.renderBoard();
    this.renderHand();
    this.updateSpaceActionPanel();
  }
,

  updateSpaceActionPanel() {
    const panel = $('#space-action-panel');
    if (!panel) return;

    if (!this.selectedSpaceCard) {
      panel.classList.add('hidden');
      return;
    }

    const { row, col } = this.selectedSpaceCard;
    const tile = this.board[row][col];
    const sc = tile.spaceCard;
    if (!sc) {
      panel.classList.add('hidden');
      return;
    }

    const title = $('#space-action-title');
    const desc = $('#space-action-desc');
    const activateBtn = $('#btn-activate-space');
    const selectUnitBtn = $('#btn-select-unit-from-space');
    const currentAP = this.currentTurn === 'player' ? this.playerAP : this.enemyAP;

    if (title) title.textContent = `${sc.emoji} ${sc.name}`;
    if (desc) {
      const status = sc.disabled ? `Disabled (${sc.disabledRounds} rounds)` : (sc.used || sc.activated ? 'Activated' : 'Ready');
      let needsUnit = '';
      if (sc.id !== 'tower' && !tile.unit) {
        needsUnit = ' Needs a troop on this tile.';
      } else if (sc.id !== 'tower' && sc.id !== 'volcano' && tile.unit.owner !== this.currentTurn) {
        needsUnit = ' Needs one of your troops on this tile.';
      }
      desc.textContent = `${sc.effect} Status: ${status}.${needsUnit}`;
    }
    if (activateBtn) {
      activateBtn.disabled = !this.canActivateSpaceCard(row, col);
      activateBtn.textContent = currentAP < 1 ? 'Need 1 AP' : 'Activate Space Card (1 AP)';
    }
    if (selectUnitBtn) {
      selectUnitBtn.classList.toggle('hidden', !tile.unit || tile.unit.owner !== this.currentTurn);
    }

    panel.classList.remove('hidden');
  }
,

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
        const viewerOwner = this.getViewerOwner();

        if (this.selectedCard) {
          if (this.canDeploy(currentOwner, r, c)) {
            tileEl.classList.add('highlight-deploy');
          }
        }

        if (this.selectedUnit) {
          const { unit, row: ur, col: uc } = this.selectedUnit;
          const dist = getDistance(ur, uc, r, c);

          const hasMoved = unit.id === 'knight' ? unit.hasMoved : this.unitsActed.has(unit.instanceId);
          if (!tile.unit && dist <= unit.moveRange && !hasMoved && !unit.volcanoEffect) {
            // Don't show move highlight if Architect is targeting an adjacent enemy space card
            const isArchitectTargetingSC = unit.id === 'architect' && dist <= 1 && tile.spaceCard
              && tile.spaceCard.owner !== currentOwner;
            if (!isArchitectTargetingSC) {
              tileEl.classList.add('highlight-move');
            }
          }

          const hasAttacked = unit.id === 'knight' ? unit.hasAttacked : this.unitsActed.has(unit.instanceId);
          if (tile.unit && tile.unit.owner !== currentOwner && dist <= unit.attackRange && !hasAttacked && unit.attack > 0) {
            const canHighlightAttack =
              (unit.id !== 'archer' && unit.id !== 'pikeman') ||
              (unit.id === 'archer' && isStraightLineAttack(ur, uc, r, c)) ||
              (unit.id === 'pikeman' && hasLineOfSight(this.board, ur, uc, r, c));
            if (canHighlightAttack) {
              tileEl.classList.add('highlight-attack');
            }
          }

          // Architect ability highlight: adjacent enemy space cards (with or without units)
          if (unit.id === 'architect' && dist <= 1 && !this.unitsActed.has(unit.instanceId)) {
            // Architect can always see adjacent enemy space cards
            if (tile.spaceCard && tile.spaceCard.owner !== currentOwner) {
              tileEl.classList.add('highlight-ability');
            }
          }

          if (unit.id === 'pope' && tile.unit && tile.unit.owner !== currentOwner && dist <= 1 && !this.unitsActed.has(unit.instanceId)) {
            if (tile.unit.id !== 'king' && tile.unit.id !== 'knight') {
              tileEl.classList.add('highlight-ability');
            }
          }
        }

        if (tile.spaceCard && tile.spaceCard.owner === currentOwner && currentOwner === viewerOwner) {
          tileEl.classList.add('space-activatable');
        }

        if (this.selectedSpaceCard && this.selectedSpaceCard.row === r && this.selectedSpaceCard.col === c) {
          tileEl.classList.add('selected-space');
        }

        const coords = document.createElement('span');
        coords.className = 'tile-coords';
        coords.textContent = CONSTANTS.COORDS[r][c];
        tileEl.appendChild(coords);

        if (this.isSpaceCardVisibleTo(tile.spaceCard, viewerOwner)) {
          const overlay = document.createElement('div');
          overlay.className = 'space-overlay';
          if (tile.spaceCard.activated || tile.spaceCard.used) overlay.classList.add('activated');
          if (tile.spaceCard.disabled) overlay.classList.add('disabled');
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
            effects.innerHTML += '💫';
          }
          if (tile.unit.shield) {
            effects.innerHTML += '🛡️';
          }
          if (tile.unit.ragePotion) {
            effects.innerHTML += '🧪';
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
,

  renderHand() {
    const handEl = $('#player-hand');
    handEl.innerHTML = '';

    const currentHand = this.currentTurn === 'player' ? this.playerHand : this.enemyHand;
    const currentAP = this.currentTurn === 'player' ? this.playerAP : this.enemyAP;
    const currentDeck = this.currentTurn === 'player' ? this.playerDeck : this.enemyDeck;

    // Update panel header for 2-player
    const panelTitle = document.querySelector('#left-panel .panel-title');
    const deckCount = $('#deck-count');
    const handCount = $('#hand-count');
    if (panelTitle) {
      panelTitle.textContent = this.currentTurn === 'player' ? "Player 1 Hand" : "Player 2 Hand";
    }
    if (handCount) handCount.textContent = `Hand ${currentHand.length}`;
    if (deckCount) deckCount.textContent = `Deck ${currentDeck.length}`;

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
,

  hoverTile(row, col) {
    const tile = this.board[row][col];
    this.renderTileInfo(tile);
    if (tile.unit) {
      this.renderUnitInfo(tile.unit);
    }
  }
,

  renderTileInfo(tile) {
    const details = $('#tile-details');
    const territory = getTerritory(tile.row);
    const score = getTerritoryScore(tile.row, true);

    let territoryName = '';
    switch(territory) {
      case 'enemy_core': territoryName = 'Player 2 Core'; break;
      case 'enemy_front': territoryName = 'Player 2 Frontline'; break;
      case 'neutral': territoryName = 'Neutral'; break;
      case 'player_front': territoryName = 'Player 1 Frontline'; break;
      case 'player_core': territoryName = 'Player 1 Core'; break;
    }

    let html = `
      <div class="info-row"><span class="info-label">Position</span><span class="info-value">${tile.coords}</span></div>
      <div class="info-row"><span class="info-label">Territory</span><span class="info-value">${territoryName}</span></div>
      <div class="info-row"><span class="info-label">Score Value</span><span class="info-value">${score} pts</span></div>
    `;

    if (this.isSpaceCardVisibleTo(tile.spaceCard, this.getViewerOwner())) {
      const sc = tile.spaceCard;
      const status = sc.disabled ? `Disabled (${sc.disabledRounds})` : (sc.used || sc.activated ? 'Activated' : 'Ready');
      html += `
        <div class="info-ability">
          <div class="info-ability-name">Space Card</div>
          <div class="info-row"><span class="info-label">Name</span><span class="info-value">${sc.emoji} ${sc.name}</span></div>
          <div class="info-row"><span class="info-label">Type</span><span class="info-value">${sc.type}</span></div>
          <div class="info-row"><span class="info-label">Status</span><span class="info-value">${status}</span></div>
          <div class="info-row"><span class="info-label">Effect</span><span class="info-value">${sc.effect}</span></div>
        </div>
      `;
    }

    details.innerHTML = html;
  }
,

  renderUnitInfo(unit) {
    const details = $('#unit-details');
    const maxHp = unit.maxHealth || unit.health;
    const currentAtk = (unit.attack || 0) + (unit.kingAttackBonus || 0);

    let html = `
      <div class="info-row"><span class="info-label">Name</span><span class="info-value">${unit.emoji} ${unit.name}</span></div>
      <div class="info-row"><span class="info-label">Health</span><span class="info-value">${unit.currentHealth}/${maxHp}</span></div>
      ${unit.attack > 0 ? `
      <div class="info-row"><span class="info-label">Attack</span><span class="info-value">${currentAtk}${unit.kingAttackBonus ? ` (base ${unit.attack} + ${unit.kingAttackBonus} King)` : ''}</span></div>
      ` : ''}
      <div class="info-row"><span class="info-label">Move</span><span class="info-value">${unit.moveRange}</span></div>
      <div class="info-row"><span class="info-label">Range</span><span class="info-value">${unit.attackRange}</span></div>
    `;

    if (unit.buffs && unit.buffs.length > 0) {
      html += `
        <div class="info-row"><span class="info-label">Buffs</span><span class="info-value">${unit.buffs.join(', ')}</span></div>
      `;
    }

    html += `
      <div class="info-ability">
        <div class="info-ability-name">Ability</div>
        <div class="info-ability-desc">${unit.ability}</div>
      </div>
    `;

    details.innerHTML = html;
  }

});
