// ===== CROWNFALL TACTICS - DECK BUILDERS =====

// Build deck
function buildDeck() {
    const pool = [];
    for (const [key, unit] of Object.entries(UNITS)) {
        for (let i = 0; i < unit.copies; i++) {
            pool.push({ ...unit, instanceId: `${unit.id}_${i}` });
        }
    }

    const king = pool.find(card => card.id === 'king');
    const nonKingCards = shuffleArray(pool.filter(card => card.id !== 'king'));
    const deck = king ? [king, ...nonKingCards.slice(0, CONSTANTS.DECK_SIZE - 1)] : nonKingCards.slice(0, CONSTANTS.DECK_SIZE);
    return shuffleArray(deck);
}

// Build space card deck
function buildSpaceDeck() {
    const deck = [];
    for (const [key, card] of Object.entries(SPACE_CARDS)) {
        deck.push({ ...card });
    }
    return shuffleArray(deck);
}

// Shuffle array
function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

