const {
    remote,
    ipcRenderer
} = require('electron');
const features = require('./features.js');

document.addEventListener('DOMContentLoaded', injectBitsySavior);

window.resetGameDataOrig = null;

function initFeatures () {
    console.log('🐈 initializing bitsy-savior features 🐈')

    const featureStatus = {};

    features.forEach(feature => {
        const requiredFunctions = feature.requiredFunctions? feature.requiredFunctions: [];
        const requiredElementIds = feature.requiredElementIds? feature.requiredElementIds: [];
        
        let featureOk = true;

        const requirements = [];

        requiredFunctions.forEach(funcName => {
            const funcNameArray = funcName.split('.');
            let parent = window;
            let object = undefined;
            for (let index = 0; index < funcNameArray.length; index++) {
                object = parent[funcNameArray[index]];
                parent = object;
            }
            
            const functionOk = Boolean(object);
            requirements.push((functionOk? '✅': '❌') + funcName + '()');
            featureOk = featureOk && functionOk;
        });

        requiredElementIds.forEach(elementId => {
            const elementOk = Boolean(document.getElementById(elementId));
            requirements.push((elementOk? '✅': '❌') + '#' + elementId);
            featureOk = featureOk && elementOk;
        });

        const status = `${feature.name}\nrequirements: ${requirements.join(', ')}`;
        if (featureOk) {
            console.log(status);
            if (feature.init) {
                feature.init();
            }
        } else {
            console.error(status);
        }

        featureStatus[feature.name] = featureOk;
    });

    return featureStatus;
}

ipcRenderer.on('call', (event, func) => {
    if (window[func]) window[func]();
});

function injectBitsySavior () {
    const paths = remote.getGlobal('paths');
    // inject editor style and layout modifications
    if (paths.editorPatch) {
        try {
            require(paths.editorPatch);
        } catch (err) {
            ipcRenderer.send('show-error-message', `Couldn't load editor patch:\n${paths.editorPatch}\n${err.stack}`);
        }
    }

    // check requirements and initialize features
    // send feature status to the main process
    ipcRenderer.send('feature-status', initFeatures());
}
