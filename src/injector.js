const {
    remote,
    ipcRenderer
} = require('electron');

document.addEventListener('DOMContentLoaded', injectBitsySavior);
console.log('hiya from bitsy-savior');

window.resetGameDataOrig = null;

function injectBitsySavior() {
    const paths = remote.getGlobal('paths');
    // inject editor style and layout modifications
    if (paths.editorPatch) {
        try {
            require(paths.editorPatch);
        } catch (err) {
            ipcRenderer.send('show-error-message', `Couldn't load editor patch:\n${paths.editorPatch}\n${err.stack}`);
        }
    }

    console.log('injecting bitsy savior');
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
    window.resetGameData = function () {
        ipcRenderer.send('reset-game-data', 'resetGameDataOrig');
    };

    // replace ExporterUtils.DownloadFile
    ExporterUtils.DownloadFile = function (fileName, fileData) {
        ipcRenderer.send('save-file', fileName, fileData);
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
