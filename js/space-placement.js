// ===== CROWNFALL TACTICS - SPACE PLACEMENT =====

function initSpacePlacement() {
  const handEl = $('#space-card-hand');
  const boardEl = $('#placement-board');
  const startBtn = $('#btn-start-match');
  const title = $('#space-placement h2');
  const instruction = $('.placement-instruction');

  handEl.innerHTML = '';
  boardEl.innerHTML = '';
  if (startBtn) {
    startBtn.disabled = true;
    startBtn.textContent = 'Continue';
  }

  if (title) title.textContent = 'Player 1: Place Your Space Cards';
  if (instruction) instruction.textContent = 'Click on your territory (rows D-E) to place space cards';

  // Draw space cards
  const playerSpaceDeck = buildSpaceDeck();
  const enemySpaceDeck = buildSpaceDeck();
  game.playerSpaceCards = playerSpaceDeck.map(c => ({ ...c }));
  game.enemySpaceCards = enemySpaceDeck.map(c => ({ ...c }));

  renderSpacePlacementUI(game.playerSpaceCards, 'player');
}

function initSpacePlacementPlayer2() {
  const handEl = $('#space-card-hand');
  const boardEl = $('#placement-board');
  const startBtn = $('#btn-start-match');
  const title = $('#space-placement h2');
  const instruction = $('.placement-instruction');

  handEl.innerHTML = '';
  boardEl.innerHTML = '';
  startBtn.disabled = true;
  if (title) title.textContent = 'Player 2: Place Your Space Cards';
  if (instruction) instruction.textContent = 'Click on your territory (rows A-B) to place space cards';

  renderSpacePlacementUI(game.enemySpaceCards, 'enemy');
}

function renderSpacePlacementUI(cards, owner) {
  const handEl = $('#space-card-hand');
  const boardEl = $('#placement-board');
  const startBtn = $('#btn-start-match');

  let selectedCardIndex = -1;

  cards.forEach((card, index) => {
    const cardEl = document.createElement('div');
    cardEl.className = 'space-card-item';
    cardEl.innerHTML = `
      <div class="space-card-icon">${card.emoji}</div>
      <div class="space-card-name">${card.name}</div>
      <div class="space-card-meta">${card.type} · 1 AP</div>
      <div class="space-card-effect">${card.effect}</div>
    `;
    cardEl.addEventListener('click', () => {
      if (cards[index].placedAt) return;
      $$('.space-card-item').forEach(el => el.classList.remove('selected'));
      cardEl.classList.add('selected');
      selectedCardIndex = index;
    });
    handEl.appendChild(cardEl);
  });

  for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
    for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
      const tileEl = document.createElement('div');
      tileEl.className = 'placement-tile';

      if (r <= 1) tileEl.classList.add('enemy-territory');
      else if (r === 2) tileEl.classList.add('neutral-territory');
      else tileEl.classList.add('player-territory');

      tileEl.dataset.row = r;
      tileEl.dataset.col = c;

      // Show already placed cards from both players in hotseat
      const existingPlayer = game.playerSpaceCards.find(pc => pc.placedAt && pc.placedAt.row === r && pc.placedAt.col === c);
      const existingEnemy = game.enemySpaceCards.find(ec => ec.placedAt && ec.placedAt.row === r && ec.placedAt.col === c);

      if (existingPlayer && owner === 'player') {
        tileEl.textContent = existingPlayer.emoji;
        tileEl.classList.add('occupied');
      } else if (existingEnemy && owner === 'enemy') {
        tileEl.textContent = existingEnemy.emoji;
        tileEl.classList.add('occupied');
      }

      tileEl.addEventListener('click', () => {
        const isPlayer1 = owner === 'player';
        if (isPlayer1 && r < 3) return;
        if (!isPlayer1 && r > 1) return;

        // Check if tile is already occupied
        const existing = cards.find(pc => pc.placedAt && pc.placedAt.row === r && pc.placedAt.col === c);

        if (existing) {
          // Remove the card from this tile
          const cardIndex = cards.indexOf(existing);
          cards[cardIndex].placedAt = null;

          const cardEl = $$('.space-card-item')[cardIndex];
          if (cardEl) {
            cardEl.classList.remove('placed');
          }

          tileEl.textContent = '';
          tileEl.classList.remove('occupied');

          const allPlaced = cards.every(c => c.placedAt);
          if (startBtn) startBtn.disabled = !allPlaced;
          return;
        }

        if (selectedCardIndex === -1) return;

        const selectedCard = cards[selectedCardIndex];
        selectedCard.placedAt = { row: r, col: c };

        const placedCardEl = $$('.space-card-item')[selectedCardIndex];
        if (placedCardEl) {
          placedCardEl.classList.remove('selected');
          placedCardEl.classList.add('placed');
        }
        selectedCardIndex = -1;

        // Update tile visually
        tileEl.textContent = selectedCard.emoji;
        tileEl.classList.add('occupied');

        const allPlaced = cards.every(c => c.placedAt);
        if (startBtn) startBtn.disabled = !allPlaced;
      });

      boardEl.appendChild(tileEl);
    }
  }
}

function randomizeSpacePlacement(owner) {
  const cards = owner === 'player' ? game.playerSpaceCards : game.enemySpaceCards;
  const startBtn = $('#btn-start-match');

  // Get available tiles for this player
  const isPlayer1 = owner === 'player';
  const availableTiles = [];
  for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
    for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
      if (isPlayer1 && r < 3) continue;
      if (!isPlayer1 && r > 1) continue;
      availableTiles.push({ row: r, col: c });
    }
  }

  shuffleArray(availableTiles);

  // Clear existing placements
  cards.forEach(card => {
    card.placedAt = null;
  });

  // Place each card on a random available tile
  cards.forEach((card, index) => {
    if (availableTiles[index]) {
      card.placedAt = availableTiles[index];
    }
  });

  // Refresh the UI
  const boardEl = $('#placement-board');
  const handEl = $('#space-card-hand');
  boardEl.innerHTML = '';
  handEl.innerHTML = '';

  renderSpacePlacementUI(cards, owner);

  const allPlaced = cards.every(c => c.placedAt);
  if (startBtn) startBtn.disabled = !allPlaced;
}

