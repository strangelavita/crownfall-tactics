// ===== CROWNFALL TACTICS - MAIN ENTRY POINT (2-PLAYER ONLY) =====

let game = null;
let audioManager = null;
let hotseatPhase = 'player1'; // 'player1' or 'player2' for space placement
let pendingMatchVariant = 'standard';


document.addEventListener('DOMContentLoaded', () => {
  initAudio();
  initEventListeners();
  setTimeout(() => {
    $('#loading-screen').classList.remove('active');
    showScreen('main-menu');
  }, 2500);
});

function startHotseatGame() {
  game = new Game();
  game.gameMode = 'hotseat';
  game.configureMatch(pendingMatchVariant);
  pendingMatchVariant = 'standard';
  hotseatPhase = 'player1';
  showScreen('space-placement');
  initSpacePlacement();
  if (audioManager) audioManager.playClick();
}
