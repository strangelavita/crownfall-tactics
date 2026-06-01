// ===== CROWNFALL TACTICS - GAME CONFIG =====

const CONSTANTS = {
    // Board
    BOARD_ROWS: 5,
    BOARD_COLS: 4,
    TOTAL_ROUNDS: 10,
    AP_PER_TURN: 3,
    MATCH_MODES: {
        quick: {
            id: 'quick',
            name: 'Quick Match',
            totalRounds: 5,
            baseAP: 5,
            doubleAPRounds: [],
            doubleScoreRounds: [5],
            fullHand: true,
            drawEachRound: false
        },
        standard: {
            id: 'standard',
            name: 'Standard Match',
            totalRounds: 10,
            baseAP: 3,
            doubleAPRounds: [],
            doubleScoreRounds: [8, 9, 10],
            fullHand: false,
            drawEachRound: true
        },
        hotseat: {
            id: 'hotseat',
            name: 'Hotseat',
            totalRounds: 15,
            baseAP: 5,
            doubleAPRounds: [],
            doubleScoreRounds: [11, 12, 13, 14, 15],
            fullHand: false,
            drawEachRound: true
        }
    },

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
