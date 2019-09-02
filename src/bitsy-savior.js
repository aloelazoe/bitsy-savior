const fse = require('fs-extra');
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
    paths.markUnsaved();
    if (remote.getGlobal('autosave')) {
      // TODO: instead call tryPatchAndExport from main process, print autosave successful or print error
      // perhaps make ipc event 'on-refresh-game-data' in main
      if (paths.export) {
        console.log('autosaving ', paths.export);
        fse.outputFile(paths.export, getFullGameData())
          .then(() => paths.markUnsaved({ export: false }))
          .catch(err => {
            // TODO: replace with native error window
            console.error(err);
          });
      }
      if (paths.patch) {
        console.log('autosaving ', paths.patch);
        fse.readFile(paths.patch, 'utf8')
          .then(bitsyHtml => {
            const updatedGameHtml = bitsyHtml.replace(
              /(<script type="text\/bitsyGameData" id="exportedGameData">)[\s\S]*?(<\/script>)/,
              (m, openingTag, closingTag) => {
                return `${openingTag}\n${getFullGameData()}\n${closingTag}`;
            });
            return fse.outputFile(paths.patch, updatedGameHtml);
          })
          .then(() => paths.markUnsaved({ patch: false }))
          .catch(err => {
            // TODO: replace with native error window
            console.error(err);
          });
      }
    }
  };

  // make sure resetting game data will open unsaved changes dialog and reset save paths
  window.resetGameDataOrig = window.resetGameData;
  window.resetGameData = function() {
    ipcRenderer.send('new-game-data', 'resetGameDataOrig');
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
  console.log("i'm going to call ", window[func]);
  if (window[func]) window[func]();
});
