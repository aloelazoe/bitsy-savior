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
    
    // * getFullGameData - save game data from the editor
    // * on_game_data_change - load game data into the editor
    // * refreshGameData - track unsaved changes
    // * resetGameData - ask about unsaved changes before resetting data and file paths
    // * ExporterUtils.DownloadFile - save to the file on disk directly and remember the saving path,
    //   instead of going through dowload file menu


    // check for bitsy functions that need to be patched or used
    ['getFullGameData', 'on_game_data_change', 'refreshGameData', 'resetGameData', 'ExporterUtils.DownloadFile'].forEach(funcName => {
        const funcNameArray = funcName.split('.');
        let parent = window;
        let object = undefined;
        for (let index = 0; index < funcNameArray.length; index++) {
            object = parent[funcNameArray[index]];
            parent = object;
        }

        if (object) {
            console.log(`✅ bitsy-savior found ${funcName} function`);
        } else {
            console.error(`❌ bitsy-savior couldn't find ${funcName} function. saving and opening files won't work properly`);
        }
    });

    // * "game_data" element - load game data into the editor

    // check for html elements that need to be interacted with
    const dataTextArea = document.getElementById("game_data");
    if (!dataTextArea) {
        const errMessage = `❌ there is no element with "game_data" id in this editor. bitsy-savior won't be able to load game data`;
        console.error(errMessage);
    } else {
        console.log(`✅ bitsy-savior found an element with "game_data" id`)
    }

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
