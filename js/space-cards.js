// ===== CROWNFALL TACTICS - SPACE CARD DEFINITIONS =====

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
