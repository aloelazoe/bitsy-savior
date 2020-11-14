const features = [
    {
        id: 'open',
        name: 'open files in editor',
        requiredFunctions: ['on_game_data_change'],
        requiredElementIds: ['game_data'],
        init: () => {
            // define a function to be called from the main process when opening a file
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
        id: 'get-data',
        name: 'save data to files',
        requiredFunctions: ['getFullGameData'],
    },
    {
        id: 'track-unsaved',
        name: 'track unsaved changes',
        requiredFunctions: ['refreshGameData'],
        exposeToRenderer: {
            markUnsaved: () => ipcRenderer.send('mark-unsaved'),
        },
        init: () => {
            // patch refreshGameData
            const refreshGameDataOrig = window.refreshGameData;
            window.refreshGameData = () => {
                refreshGameDataOrig.call(window);
                BitsySavior.markUnsaved();
            };
        }
    },
    {
        id: 'handle-reset',
        name: 'ask about unsaved changes before resetting data & reset save paths when resetting data',
        requiredFunctions: ['resetGameData'],
        exposeToRenderer: {
            resetGameData: () => ipcRenderer.invoke('reset-game-data'),
        },
        init: function () {
            // make sure resetting game data will open unsaved changes dialog and reset save paths
            const resetGameDataOrig = window.resetGameData;
            window.resetGameData = function () {
                BitsySavior.resetGameData().then(resetGameDataOrig);
            };
        }
    },
    {
        id: 'save-new',
        name: 'save as new html',
        requiredFunctions: ['ExporterUtils.DownloadFile', 'exportGame'],
        exposeToRenderer: {
            saveNewFile: (fileName, fileData) => ipcRenderer.send('save-new-file', fileName, fileData),
        },
        init: function () {
            // replace ExporterUtils.DownloadFile
            ExporterUtils.DownloadFile = function (fileName, fileData) {
                BitsySavior.saveNewFile(fileName, fileData);
            };
        }
    }
];

// to be executed in the renderer process
function checkFunction (funcName) {
    const funcNameArray = funcName.split('.');
    let parent = window;
    let object = undefined;
    for (let index = 0; index < funcNameArray.length; index++) {
        if (!parent) break;
        object = parent[funcNameArray[index]];
        parent = object;
    }
    return Boolean(object);
}

// to be executed in the renderer process
function checkElementId(elementId) {
    return Boolean(document.getElementById(elementId));
}

module.exports.init = async function initFeatures () {
    console.log('🐈 initializing bitsy-savior features 🐈')

    const exposeToRenderer = [];
    const featureStatus = {};
    const inits = [];

    for (let i = 0; i < features.length; i++) {
        const feature = features[i];
        const requiredFunctions = feature.requiredFunctions? feature.requiredFunctions: [];
        const requiredElementIds = feature.requiredElementIds? feature.requiredElementIds: [];
        
        let featureOk = true;
        const requirements = [];

        for (let i = 0; i < requiredFunctions.length; i++) {
            const funcName = requiredFunctions[i];
            const functionOk = await global.bitsyWindow.webContents.executeJavaScript(`(${checkFunction.toString()})('${funcName}');`);
            requirements.push((functionOk? '✅': '❌') + funcName + '()');
            featureOk = featureOk && functionOk;
        }

        for (let i = 0; i < requiredElementIds.length; i++) {
            const elementId = requiredElementIds[i];
            const elementOk = await global.bitsyWindow.webContents.executeJavaScript(`(${checkElementId.toString()})('${elementId}');`);
            requirements.push((elementOk? '✅': '❌') + '#' + elementId);
            featureOk = featureOk && elementOk;
        }

        const status = `${feature.name}\nrequirements: ${requirements.join(', ')}`;
        if (featureOk) {
            console.log(status);
            if (feature.exposeToRenderer) {
                Object.entries(feature.exposeToRenderer).forEach(entry => {
                    exposeToRenderer.push(entry[0] + ': ' + entry[1].toString() + ',');
                })
            }
            if (feature.init) {
                inits.push(feature.init);
            }
        } else {
            console.error(status);
        }

        featureStatus[feature.id] = featureOk;
    }

    // expose inter process communication functions to the renderer
    if (exposeToRenderer.length > 0) {
        const code = `contextBridge.exposeInMainWorld('BitsySavior', {
            ${exposeToRenderer.join('\n')}
        });`

        try {
            await global.bitsyWindow.webContents.executeJavaScriptInIsolatedWorld(999, [{
                code: code,
            }]);
        } catch (err) {
            console.log('error when exposing inter-process functionality to the renderer:');
            console.error(err);
        }
    }

    for (let i = 0; i < inits.length; i++) {
        try {
            await global.bitsyWindow.webContents.executeJavaScript(`(${inits[i].toString()})();`);
        } catch (err) {
            console.error(err);
        } 
    }
    
    await global.bitsyWindow.webContents.executeJavaScript(`console.log(${JSON.stringify(featureStatus)})`);

    return featureStatus;
}
