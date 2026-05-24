# Crownfall Tactics

A fully playable browser-based 2D tactical card strategy game with medieval dark fantasy pixel-art visuals.

## How to Play

1. Open `index.html` in any modern web browser (Chrome, Firefox, Edge recommended)
2. No server or build step required - runs entirely client-side

## Game Modes

### VS AI
- Play against a computer opponent with 3 difficulty levels (Easy, Normal, Hard)
- AI prioritizes high-value targets, protects its king, and pushes aggressively in late rounds

### Hotseat Multiplayer (PvP Local)
- Two players take turns on the same computer
- Player 1 controls blue units (bottom territory), Player 2 controls red units (top territory)
- Each player places their space cards before the match begins
- Pass the mouse between turns

## Board
- **Size**: 5 rows × 4 columns
- **Territories**:
  - Rows A-B: Enemy territory (top)
  - Row C: Neutral territory (middle)
  - Rows D-E: Player territory (bottom)

## Recent Updates

### Board Size
- Changed from 5×3 to **5×4** columns

### Unit Changes
- **Swordsman**: Starting copies increased from 4 to **6**
- **Pikeman**: Starting copies increased from 3 to **4**
  - Now **can only attack in straight lines** (line of sight required)
- **Archer**: Starting copies increased from 3 to **4**

### King Updates
- **Passive Buffs**:
  - In own territory: Allies gain +15 max health
  - In enemy territory: Allies gain **+20 attack AND +15 max health**
- **Penalty**: If King dies, owner **loses the game immediately** (no point penalty, instant game over)

### Game Modes
- Added **Player vs Player Local Hotseat** mode
- Both players place space cards before match start
- Full turn-based control for both players

## Controls
- **Click** cards in hand to select them
- **Click** tiles to deploy units (your territory only)
- **Click** your units to select them
- **Click** highlighted tiles to move or attack
- **End Turn** button or **Space/Enter** key to end your turn
- **ESC** key for pause menu

## Files
- `index.html` - Main game page
- `css/style.css` - All game styles
- `js/constants.js` - Game constants and unit/space card definitions
- `js/utils.js` - Utility functions
- `js/audio.js` - Audio manager (placeholder for sound effects)
- `js/ai.js` - AI opponent logic
- `js/game.js` - Core game engine
- `js/main.js` - Entry point and UI event handlers
