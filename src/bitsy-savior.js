const fse = require('fs-extra');

console.log('hiya from bitsy-savior');
document.addEventListener('DOMContentLoaded', injectBitsySavior);

const gameHtmlPath = 'test/game.html';
const bitsyDataPath = 'test/data.bitsy';

function injectBitsySavior() {
  console.log('injecting bitsy savior');
  refreshGameDataOrig = window.refreshGameData;
  window.refreshGameData = function () {
    refreshGameDataOrig.call(window);
    fse.outputFile(bitsyDataPath, getFullGameData())
      .catch(err => {
        console.error(err);
      });
    fse.readFile(gameHtmlPath, 'utf8')
      .then(bitsyHtml => {
        const updatedGameHtml = bitsyHtml.replace(
          /(<script type="text\/bitsyGameData" id="exportedGameData">)[\s\S]*?(<\/script>)/,
          (m, openingTag, closingTag) => {
            return `${openingTag}\n${getFullGameData()}\n${closingTag}`;
        });
        return fse.outputFile(gameHtmlPath, updatedGameHtml);
      })
      .catch(err => {
        console.error(err);
      });
  }
}
