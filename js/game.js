// ===== CROWNFALL TACTICS - GAME STATE =====

class Game {
  constructor() {
    this.board = [];
    this.playerDeck = [];
    this.enemyDeck = [];
    this.playerHand = [];
    this.enemyHand = [];
    this.playerSpaceCards = [];
    this.enemySpaceCards = [];
    this.round = 1;
    this.phase = CONSTANTS.PHASE.DRAW;
    this.playerAP = 0;
    this.enemyAP = 0;
    this.playerScore = 0;
    this.enemyScore = 0;
    this.currentTurn = 'player';
    this.selectedCard = null;
    this.selectedUnit = null;
    this.selectedSpaceCard = null;
    this.units = [];
    this.unitsActed = new Set();
    this.gameMode = 'hotseat';
    this.matchVariant = 'standard';
    this.totalRounds = CONSTANTS.TOTAL_ROUNDS;
    this.baseAP = CONSTANTS.AP_PER_TURN;
    this.doubleAPRounds = [];
    this.doubleScoreRounds = [];
    this.fullHandMode = false;
    this.drawEachRound = true;
    this.finalRoundScored = false;
    this.isGameOver = false;
    this.kingAlive = { player: true, enemy: true };
    this.popeCooldowns = { player: 0, enemy: 0 };
    this.spaceCardEffects = [];
    this.stunnedUnits = new Set();
    this.convertedUnits = new Set();
    this.towerDamages = [];
    this.init();
  }


  init() {
    this.initBoard();
    this.playerDeck = buildDeck();
    this.enemyDeck = buildDeck();
    this.playerHand = [];
    this.enemyHand = [];
    this.units = [];
    this.selectedCard = null;
    this.selectedUnit = null;
    this.selectedSpaceCard = null;
    this.drawStartingHands();
  }


  configureMatch(variant = 'standard') {
    const mode = CONSTANTS.MATCH_MODES[variant] || CONSTANTS.MATCH_MODES.standard;
    this.matchVariant = mode.id;
    this.totalRounds = mode.totalRounds;
    this.baseAP = mode.baseAP;
    this.doubleAPRounds = [...mode.doubleAPRounds];
    this.doubleScoreRounds = [...mode.doubleScoreRounds];
    this.fullHandMode = mode.fullHand;
    this.drawEachRound = mode.drawEachRound;
  }


  isDoubleScoreRound(round = this.round) {
    return this.doubleScoreRounds.includes(round);
  }


  isDoubleAPRound(round = this.round) {
    return this.doubleAPRounds.includes(round);
  }


  getAPForRound(round = this.round) {
    return this.isDoubleAPRound(round) ? this.baseAP * 2 : this.baseAP;
  }


  initBoard() {
    this.board = [];
    for (let r = 0; r < CONSTANTS.BOARD_ROWS; r++) {
      const row = [];
      for (let c = 0; c < CONSTANTS.BOARD_COLS; c++) {
        row.push({
          row: r, col: c, unit: null, spaceCard: null,
          coords: CONSTANTS.COORDS[r][c]
        });
      }
      this.board.push(row);
    }
  }


  drawStartingHands() {
    if (this.fullHandMode) {
      this.drawAllCards('player');
      this.drawAllCards('enemy');
      return;
    }

    for (let i = 0; i < CONSTANTS.STARTING_HAND_SIZE; i++) {
      this.drawCard('player');
      this.drawCard('enemy');
    }
  }


  drawAllCards(owner) {
    let card = this.drawCard(owner);
    while (card) {
      card = this.drawCard(owner);
    }
  }


  drawCard(owner) {
    const deck = owner === 'player' ? this.playerDeck : this.enemyDeck;
    const hand = owner === 'player' ? this.playerHand : this.enemyHand;
    if (deck.length > 0) {
      const card = deck.pop();
      hand.push({ ...card, owner });
      return card;
    }
    return null;
  }

}
