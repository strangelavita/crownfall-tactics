// ===== CROWNFALL TACTICS - UNIT DEFINITIONS =====

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
