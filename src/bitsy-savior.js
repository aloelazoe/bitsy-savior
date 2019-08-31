const fse = require('fs-extra');
const {
  remote
} = require('electron');

document.addEventListener('DOMContentLoaded', injectBitsySavior);
console.log('hiya from bitsy-savior');

function injectBitsySavior() {
  console.log('injecting bitsy savior');
  // patch refreshGameData
  refreshGameDataOrig = window.refreshGameData;
  window.refreshGameData = function () {
    refreshGameDataOrig.call(window);
    const paths = remote.getGlobal('paths');
    paths.markUnsaved();
    if (remote.getGlobal('autosave')) {
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
    // TODO: instead call tryPatchAndExport from main process, print autosave successful or print error
  }
  // TODO: patch reset game data so that it will reset save paths
  // make sure they are reset before refreshGameData is called again
}
