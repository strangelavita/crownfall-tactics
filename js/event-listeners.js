// ===== CROWNFALL TACTICS - EVENT LISTENERS =====

function initEventListeners() {
  // Main Menu
  $('#btn-vs-ai').addEventListener('click', () => {
    pendingMatchVariant = 'standard';
    startHotseatGame();
    if (audioManager) audioManager.playClick();
  });

  $('#btn-quick-match').addEventListener('click', () => {
    pendingMatchVariant = 'quick';
    startHotseatGame();
    if (audioManager) audioManager.playClick();
  });

  $('#btn-hotseat').addEventListener('click', () => {
    pendingMatchVariant = 'hotseat';
    startHotseatGame();
    if (audioManager) audioManager.playClick();
  });

  $('#btn-tutorial').addEventListener('click', () => {
    showOverlay('tutorial-overlay');
    if (audioManager) audioManager.playClick();
  });

  $('#btn-settings').addEventListener('click', () => {
    showOverlay('settings-menu');
    if (audioManager) audioManager.playClick();
  });

  // Difficulty Select - hide or redirect to hotseat
  $('#btn-easy').addEventListener('click', () => {
    pendingMatchVariant = 'standard';
    startHotseatGame();
  });
  $('#btn-normal').addEventListener('click', () => {
    pendingMatchVariant = 'quick';
    startHotseatGame();
  });
  $('#btn-back-diff').addEventListener('click', () => {
    pendingMatchVariant = 'standard';
    showScreen('main-menu');
    if (audioManager) audioManager.playClick();
  });

  // Space Placement
  $('#btn-randomize-placement').addEventListener('click', () => {
    if (!game) return;
    const owner = hotseatPhase === 'player2' ? 'enemy' : 'player';
    randomizeSpacePlacement(owner);
    if (audioManager) audioManager.playClick();
  });

  $('#btn-start-match').addEventListener('click', () => {
    if (!game) return;
    if (hotseatPhase === 'player1') {
      hotseatPhase = 'player2';
      const btn = $('#btn-start-match');
      if (btn) btn.textContent = 'Continue to Match';
      initSpacePlacementPlayer2();
    } else {
      game.startMatch();
    }
    if (audioManager) audioManager.playClick();
  });

  // Game Screen
  $('#btn-end-turn').addEventListener('click', () => {
    if (!game || game.isGameOver) return;
    if (game.currentTurn === 'player') {
      game.endPlayerTurn();
    } else if (game.currentTurn === 'enemy') {
      game.endEnemyTurn();
    }
    if (audioManager) audioManager.playClick();
  });

  $('#btn-pause').addEventListener('click', () => {
    showOverlay('pause-menu');
    if (audioManager) audioManager.playClick();
  });

  $('#btn-activate-space').addEventListener('click', () => {
    if (!game || game.isGameOver) return;
    game.activateSelectedSpaceCard();
    if (audioManager) audioManager.playClick();
  });

  $('#btn-select-unit-from-space').addEventListener('click', () => {
    if (!game || !game.selectedSpaceCard) return;
    const { row, col } = game.selectedSpaceCard;
    game.selectUnit(row, col);
    if (audioManager) audioManager.playClick();
  });

  // Pause Menu
  $('#btn-resume').addEventListener('click', () => {
    hideOverlay('pause-menu');
    if (audioManager) audioManager.playClick();
  });

  $('#btn-restart').addEventListener('click', () => {
    hideOverlay('pause-menu');
    if (game) {
      game.isGameOver = true;
      showScreen('space-placement');
      hotseatPhase = 'player1';
      initSpacePlacement();
    }
    if (audioManager) audioManager.playClick();
  });

  $('#btn-settings-pause').addEventListener('click', () => {
    hideOverlay('pause-menu');
    showOverlay('settings-menu');
    if (audioManager) audioManager.playClick();
  });

  $('#btn-quit').addEventListener('click', () => {
    hideOverlay('pause-menu');
    showScreen('main-menu');
    if (audioManager) audioManager.playClick();
  });

  // Settings
  $('#btn-close-settings').addEventListener('click', () => {
    hideOverlay('settings-menu');
    if (audioManager) audioManager.playClick();
  });

  $('#music-volume').addEventListener('input', (e) => {
    saveSetting('musicVolume', e.target.value);
    if (audioManager) audioManager.setMusicVolume(e.target.value / 100);
  });

  $('#sfx-volume').addEventListener('input', (e) => {
    saveSetting('sfxVolume', e.target.value);
    if (audioManager) audioManager.setSFXVolume(e.target.value / 100);
  });

  $('#anim-speed').addEventListener('change', (e) => {
    saveSetting('animSpeed', e.target.value);
  });

  $('#btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  });

  // Tutorial
  $('#btn-close-tutorial').addEventListener('click', () => {
    hideOverlay('tutorial-overlay');
    if (audioManager) audioManager.playClick();
  });

  // Game Over
  $('#btn-play-again').addEventListener('click', () => {
    hideOverlay('game-over');
    showScreen('space-placement');
    hotseatPhase = 'player1';
    initSpacePlacement();
    if (audioManager) audioManager.playClick();
  });

  $('#btn-menu').addEventListener('click', () => {
    hideOverlay('game-over');
    showScreen('main-menu');
    if (audioManager) audioManager.playClick();
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const pauseMenu = $('#pause-menu');
      const gameScreen = $('#game-screen');
      if (gameScreen.classList.contains('active') && !pauseMenu.classList.contains('active')) {
        showOverlay('pause-menu');
      } else if (pauseMenu.classList.contains('active')) {
        hideOverlay('pause-menu');
      }
    }
    if (e.key === ' ' || e.key === 'Enter') {
      if (game && !game.isGameOver && $('#game-screen').classList.contains('active')) {
        if (game.currentTurn === 'player') {
          game.endPlayerTurn();
        } else if (game.currentTurn === 'enemy') {
          game.endEnemyTurn();
        }
      }
    }
  });

  // Load saved settings
  const musicVol = loadSetting('musicVolume', '70');
  const sfxVol = loadSetting('sfxVolume', '80');
  const animSpeed = loadSetting('animSpeed', '1');

  $('#music-volume').value = musicVol;
  $('#sfx-volume').value = sfxVol;
  $('#anim-speed').value = animSpeed;
}
