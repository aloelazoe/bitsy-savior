const {
  remote,
  ipcRenderer
} = require('electron');

document.addEventListener('DOMContentLoaded', injectBitsySavior);
console.log('hiya from bitsy-savior');

window.resetGameDataOrig = null;

function injectBitsySavior() {
  console.log('injecting bitsy savior');
  const paths = remote.getGlobal('paths');
  // patch refreshGameData
  const refreshGameDataOrig = window.refreshGameData;
  window.refreshGameData = function () {
    refreshGameDataOrig.call(window);
    if (remote.getGlobal('autosave')) {
      ipcRenderer.send('autosave');
    } else {
      paths.markUnsaved();
    }
  };

  // make sure resetting game data will open unsaved changes dialog and reset save paths
  window.resetGameDataOrig = window.resetGameData;
  window.resetGameData = function() {
    ipcRenderer.send('reset-game-data', 'resetGameDataOrig');
  };

  window.tryLoadingGameData = function (data) {
    const oldData = document.getElementById("game_data").value;
    try {
      document.getElementById("game_data").value = data;
      window.on_game_data_change();
    } catch (err) {
      document.getElementById("game_data").value = oldData;
      window.on_game_data_change();
      const errMessage = 'Game data is invalid\n' + err.stack;
      return errMessage;
    }
  };
}

ipcRenderer.on('call', (event, func) => {
  if (window[func]) window[func]();
});
