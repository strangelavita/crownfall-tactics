// ===== CROWNFALL TACTICS - END GAME =====

Object.assign(Game.prototype, {
  async endGame() {
    if (this.isGameOver) return;
    this.isGameOver = true;

    // Natural game end arrives after the final resolution phase, so avoid scoring it twice.
    if (this.kingAlive.player && this.kingAlive.enemy && !this.finalRoundScored) {
      const playerTerritoryScore = this.calculateTerritoryScore('player');
      const enemyTerritoryScore = this.calculateTerritoryScore('enemy');
      let multiplier = this.isDoubleScoreRound() ? CONSTANTS.SCORE_FINAL_MULTIPLIER : 1;
      this.playerScore += playerTerritoryScore * multiplier;
      this.enemyScore += enemyTerritoryScore * multiplier;
    }

    let winner = null;
    let tiebreaker = '';

    if (!this.kingAlive.player) {
      winner = 'enemy';
      tiebreaker = 'Player 1 King was slain!';
    } else if (!this.kingAlive.enemy) {
      winner = 'player';
      tiebreaker = 'Player 2 King was slain!';
    } else if (this.playerScore > this.enemyScore) {
      winner = 'player';
    } else if (this.enemyScore > this.playerScore) {
      winner = 'enemy';
    } else {
      const playerUnits = this.units.filter(u => u.owner === 'player').length;
      const enemyUnits = this.units.filter(u => u.owner === 'enemy').length;

      if (playerUnits > enemyUnits) {
        winner = 'player';
        tiebreaker = 'Tiebreaker: Most surviving troops';
      } else if (enemyUnits > playerUnits) {
        winner = 'enemy';
        tiebreaker = 'Tiebreaker: Most surviving troops';
      } else {
        const playerHealth = this.units.filter(u => u.owner === 'player').reduce((sum, u) => sum + u.currentHealth, 0);
        const enemyHealth = this.units.filter(u => u.owner === 'enemy').reduce((sum, u) => sum + u.currentHealth, 0);

        if (playerHealth > enemyHealth) {
          winner = 'player';
          tiebreaker = 'Tiebreaker: Highest total health';
        } else if (enemyHealth > playerHealth) {
          winner = 'enemy';
          tiebreaker = 'Tiebreaker: Highest total health';
        } else {
          tiebreaker = 'Perfect tie!';
        }
      }
    }

    const resultEl = $('#game-result');
    if (winner === 'player') {
      resultEl.textContent = 'Player 1 Wins!';
      resultEl.className = 'victory';
    } else if (winner === 'enemy') {
      resultEl.textContent = 'Player 2 Wins!';
      resultEl.className = 'defeat';
    } else {
      resultEl.textContent = 'Draw!';
      resultEl.className = '';
    }

    $('#final-player-score').textContent = this.playerScore;
    $('#final-enemy-score').textContent = this.enemyScore;
    $('#tiebreaker-info').textContent = tiebreaker;

    showOverlay('game-over');
  }
});
