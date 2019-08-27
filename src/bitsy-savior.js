const fse = require('fs-extra');
const {
  remote
} = require('electron');

document.addEventListener('DOMContentLoaded', injectBitsySavior);
console.log('hiya from bitsy-savior');

function injectBitsySavior() {
  console.log('injecting bitsy savior');
  refreshGameDataOrig = window.refreshGameData;
  window.refreshGameData = function () {
    refreshGameDataOrig.call(window);
    fse.outputFile(remote.getGlobal('bitsyDataPath'), getFullGameData())
      .catch(err => {
        console.error(err);
      });
    fse.readFile(remote.getGlobal('gameHtmlPath'), 'utf8')
      .then(bitsyHtml => {
        const updatedGameHtml = bitsyHtml.replace(
          /(<script type="text\/bitsyGameData" id="exportedGameData">)[\s\S]*?(<\/script>)/,
          (m, openingTag, closingTag) => {
            return `${openingTag}\n${getFullGameData()}\n${closingTag}`;
        });
        return fse.outputFile(remote.getGlobal('gameHtmlPath'), updatedGameHtml);
      })
      .catch(err => {
        console.error(err);
      });
  }
}
