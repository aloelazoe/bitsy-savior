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
    fse.outputFile(remote.getGlobal('paths').export, getFullGameData())
      .catch(err => {
        console.error(err);
      });
    fse.readFile(remote.getGlobal('paths').patch, 'utf8')
      .then(bitsyHtml => {
        const updatedGameHtml = bitsyHtml.replace(
          /(<script type="text\/bitsyGameData" id="exportedGameData">)[\s\S]*?(<\/script>)/,
          (m, openingTag, closingTag) => {
            return `${openingTag}\n${getFullGameData()}\n${closingTag}`;
        });
        return fse.outputFile(remote.getGlobal('paths').patch, updatedGameHtml);
      })
      .catch(err => {
        console.error(err);
      });
  }
  // TODO: patch reset game data so that it will reset save paths
  // make sure they are reset before refreshGameData is called again
}
