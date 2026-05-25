// ===== CROWNFALL TACTICS - CONSTANTS =====

const CONSTANTS = {
    // Board
    BOARD_ROWS: 5,
    BOARD_COLS: 4,
    TOTAL_ROUNDS: 10,
    AP_PER_TURN: 3,

    // Territory Scoring
    SCORE_OWN: 5,
    SCORE_NEUTRAL: 10,
    SCORE_ENEMY: 20,
    SCORE_FINAL_MULTIPLIER: 2,
    FINAL_ROUNDS: [8, 9, 10],
    QUICK_MATCH_TOTAL_ROUNDS: 5,
    QUICK_MATCH_DOUBLE_ROUNDS: [5],

    // Territories
    TERRITORY: {
        ENEMY_CORE: 0,
        ENEMY_FRONT: 1,
        NEUTRAL: 2,
        PLAYER_FRONT: 3,
        PLAYER_CORE: 4
    },

    // Phases
    PHASE: {
        DRAW: 'draw',
        PLAYER_TURN: 'player_turn',
        ENEMY_TURN: 'enemy_turn',
        RESOLUTION: 'resolution'
    },

    // Tile coordinates
    COORDS: [
        ['a1','a2','a3','a4'],
        ['b1','b2','b3','b4'],
        ['c1','c2','c3','c4'],
        ['d1','d2','d3','d4'],
        ['e1','e2','e3','e4']
    ],

    // Starting hand
    STARTING_HAND_SIZE: 5,
    DECK_SIZE: 15,

    // King penalty
    KING_DEATH_PENALTY: 100,

    // Pope conversion
    POPE_CONVERT_CHANCE: 0.99,
    POPE_COOLDOWN: 2,

    // Space cards
    SPACE_CARDS_PER_PLAYER: 6,

    // Animation speeds
    ANIM_SPEED: {
        FAST: 0.5,
        NORMAL: 1,
        SLOW: 1.5
    }
};

// Unit Definitions
const UNITS = {
    SWORDSMAN: {
        id: 'swordsman',
        name: 'Swordsman',
        emoji: '⚔️',
        attack: 10,
        health: 60,
        maxHealth: 60,
        attackRange: 1,
        moveRange: 1,
        apCost: 1,
        copies: 6,
        ability: 'Can either move OR attack.',
        role: 'Balanced frontline fighter.'
    },
    PIKEMAN: {
        id: 'pikeman',
        name: 'Pikeman',
        emoji: '🔱',
        attack: 15,
        health: 30,
        maxHealth: 30,
        attackRange: 2,
        moveRange: 1,
        apCost: 1,
        copies: 4,
        ability: 'Can only attack in straight lines.',
        role: 'Mid-range pressure unit.'
    },
    ARCHER: {
        id: 'archer',
        name: 'Archer',
        emoji: '🏹',
        attack: 10,
        health: 20,
        maxHealth: 20,
        attackRange: 3,
        moveRange: 1,
        apCost: 1,
        copies: 4,
        ability: 'Can only attack in straight lines.',
        role: 'Long-range glass cannon.'
    },
    KNIGHT: {
        id: 'knight',
        name: 'Knight',
        emoji: '🐴',
        attack: 15,
        health: 70,
        maxHealth: 70,
        attackRange: 1,
        moveRange: 2,
        apCost: 2,
        copies: 2,
        ability: 'Can move then attack, attack only, or move only.',
        role: 'Aggressive mobile bruiser.'
    },
    POPE: {
        id: 'pope',
        name: 'Pope',
        emoji: '✝️',
        attack: 0,
        health: 40,
        maxHealth: 40,
        attackRange: 1,
        moveRange: 1,
        apCost: 1,
        copies: 1,
        ability: 'CONVERT: 30% chance to convert target troop (not King/Knight). Converted unit stunned for 1 turn. 2-round cooldown.',
        role: 'High-risk control support.'
    },
    KING: {
        id: 'king',
        name: 'King',
        emoji: '👑',
        attack: 15,
        health: 100,
        maxHealth: 100,
        attackRange: 1,
        moveRange: 1,
        apCost: 3,
        copies: 1,
        ability: 'In own territory: allies gain +15 max health. In enemy territory: allies gain +20 attack and +15 max health. Death = lose game.',
        role: 'High-value strategic commander.'
    },
    ARCHITECT: {
        id: 'architect',
        name: 'Architect',
        emoji: '🔨',
        attack: 0,
        health: 40,
        maxHealth: 40,
        attackRange: 1,
        moveRange: 1,
        apCost: 2,
        copies: 1,
        ability: 'Disable adjacent enemy space card for 2 rounds. Can destroy unactivated one-time space cards.',
        role: 'Utility disruption support.'
    }
};

// Space Card Definitions
const SPACE_CARDS = {
    CASTLE: {
        id: 'castle',
        name: 'Castle',
        emoji: '🏰',
        type: 'permanent',
        effect: 'Troop occupying tile gains +40 max health.',
        description: 'Stone fortress tile overlay.'
    },
    VOLCANO: {
        id: 'volcano',
        name: 'Volcano',
        emoji: '🌋',
        type: 'one-time',
        effect: 'Target troop cannot move this turn and takes 50% increased damage.',
        description: 'Cracked lava tile eruption.'
    },
    SHIELD: {
        id: 'shield',
        name: 'Shield',
        emoji: '🛡️',
        type: 'one-time',
        effect: 'Blocks next incoming damage entirely.',
        description: 'Blue protective barrier.'
    },
    RAGE_POTION: {
        id: 'rage_potion',
        name: 'Rage Potion',
        emoji: '🧪',
        type: 'one-time',
        effect: 'Next attack deals 200% damage.',
        description: 'Red glowing aura.'
    },
    HEALTH_POTION: {
        id: 'health_potion',
        name: 'Health Potion',
        emoji: '💚',
        type: 'one-time',
        effect: 'Restore troop to full health.',
        description: 'Green healing particles.'
    },
    TOWER: {
        id: 'tower',
        name: 'Tower',
        emoji: '🗼',
        type: 'permanent',
        effect: "At start of owner's turn: deal 5 damage to all adjacent enemies.",
        description: 'Arrow tower firing animation.'
    }
};

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
