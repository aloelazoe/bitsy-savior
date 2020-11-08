const {
    remote,
    ipcRenderer
} = require('electron');

module.exports = [
    {
        name: 'open files in editor',
        requiredFunctions: ['on_game_data_change'],
        requiredElementIds: ['game_data'],
        init: function () {
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
        },
    },
    {
        name: 'save data to files',
        requiredFunctions: ['getFullGameData'],
    },
    {
        name: 'track unsaved changes',
        requiredFunctions: ['refreshGameData'],
        init: function () {
            // patch refreshGameData
            const refreshGameDataOrig = window.refreshGameData;
            window.refreshGameData = function () {
                refreshGameDataOrig.call(window);
                if (remote.getGlobal('autosave')) {
                    ipcRenderer.send('autosave');
                } else {
                    ipcRenderer.send('mark-unsaved');
                }
            };
        }
    },
    {
        name: 'ask about unsaved changes before resetting data & reset save paths when resetting data',
        requiredFunctions: ['resetGameData'],
        init: function () {
            // make sure resetting game data will open unsaved changes dialog and reset save paths
            window.resetGameDataOrig = window.resetGameData;
            window.resetGameData = function () {
                ipcRenderer.send('reset-game-data', 'resetGameDataOrig');
            };
        }
    },
    {
        name: 'save as new html',
        requiredFunctions: ['ExporterUtils.DownloadFile'],
        init: function () {
            // replace ExporterUtils.DownloadFile
            ExporterUtils.DownloadFile = function (fileName, fileData) {
                ipcRenderer.send('save-file', fileName, fileData);
            };
        }
    }
];
