const {
    app,
    BrowserWindow,
    Menu,
    dialog,
    ipcMain,
    shell
} = require('electron');
const storage = require('./storage');
const {
    tryPatchAndExport,
    checkUnsavedThen,
    reportError,
    saveNewHtml,
    exportData,
    loadGameDataFromFile
} = require('./utils');
const menu = require('./menu');
const { checkUpdates } = require('./check-updates');

const paths = require('./paths');
paths.onPatchChanged = function () {
    // enable or disable 'run game' menu item depending on
    // whether there is an html file for patching that can be run

    // console.log('onPatchChanged has been called');
    
    let runItem;
    try {
        runItem = Menu.getApplicationMenu().items.find(item => item.label === 'File')
            .submenu.items.find(item => item.label === 'Run bitsy game in browser');
    } catch (err) {
        console.error(err);
    }

    if (runItem) {
        runItem.enabled = Boolean(this.patch);
    }
}

global.autosave = false;

app.on('ready', () => {
    // load stored data about the editors
    let storedData = storage.read();
    console.log(storedData);

    // if data doesn't include editor list because it's from the older version,
    // convert it and write it to the file first
    if (!storedData.hasOwnProperty('editors') || !storedData.hasOwnProperty('editorIndex')) {
        const storedPaths = storedData.paths;
        if (storedPaths) Object.assign(paths, storedPaths);
        storedData = {
            editors: [
                {
                    name: 'bitsy',
                    description: 'vanilla bitsy that came packaged with bitsy-savior',
                    type: 'builtinVanilla',
                    paths: paths.serialize(),
                }
            ],
            editorIndex: 0
        }
        storage.save(storedData);
    }

    global.storedData = storedData;
    global.newEditor = makeNewEditor();

    createLauncherWindow();

    checkUpdates();
});

function makeNewEditor() {
    return {
        name: '',
        description: '',
        type: 'local',
        editorPath: '',
        paths: paths.serializeEmpty(),
    };
}

function createLauncherWindow() {
    if (global.launcherWindow && !global.launcherWindow.isDestroyed()) {
        launcherWindow.show();
        return;
    }

    const win = global.launcherWindow = new BrowserWindow({
        width: 512,
        height: 512,
        fullscreenWindowTitle: true,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
        }
    })

    win.loadFile('src/launcher/index.html');
}

ipcMain.on('resetNewEditor', (event) => {
    global.newEditor = makeNewEditor();
    event.reply('resetNewEditorReply');
});

ipcMain.on('setEditorPath', (event, arg) => {
    dialog.showOpenDialog({
        buttonLabel: 'Select',
        filters: [{
            name: 'Html with a bitsy editor',
            extensions: ['html']
        }]
    })
    .then((result) => {
        // const { filePaths: [p] } = result;
        // console.log('result:');
        // console.log(result);
        if (result.canceled || result.filePaths.length === 0) return;
        const newPath = result.filePaths[0];
        switch (arg) {
            case 'current':
                const curEditor = global.storedData.editors[global.storedData.editorIndex];
                // console.log(curEditor);
                console.log(`setting the path of the current editor ${curEditor.name} to ${newPath}`);
                curEditor.editorPath = newPath;
                break;
            
            case 'new':
                // console.log(global.newEditor);
                console.log(`setting the path of the new editor ${global.newEditor.name} to ${newPath}`);
                global.newEditor.editorPath = newPath;
                break;
        
            default:
                break;
        }
        event.reply('setEditorPathReply');
    })
});

ipcMain.on('runEditor', () => {
    createEditorWindow();
    if (global.launcherWindow && !global.launcherWindow.isDestroyed()) {
        launcherWindow.destroy();
    }
});

ipcMain.on('saveData', () => {
    storage.save(global.storedData);
});

function createEditorWindow() {
    const { screen } = require('electron');
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    if (global.bitsyWindow && !global.bitsyWindow.isDestroyed()) {
        console.log('bitsy editor is already running!');
        global.bitsyWindow.show();
        return;
    }

    const win = global.bitsyWindow = new BrowserWindow({
        width: width,
        height: height,
        fullscreenWindowTitle: true,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true,
            preload: require.resolve('./injector'),
        }
    })

    let editorPath;

    const currentEditor = global.storedData.editors[global.storedData.editorIndex];
    if (currentEditor.type === 'builtinVanilla') {
        editorPath = 'src/bitsy/editor/index.html';
    } else {
        editorPath = currentEditor.editorPath;
    }

    win.loadFile(editorPath);
    // win.webContents.openDevTools();

    // set menu before loading paths
    Menu.setApplicationMenu(menu);

    paths.setFromStorage();
    let p = paths[paths.lastSavedAlone] || paths.export || paths.patch;
    if (p) {
        loadGameDataFromFile(p, false)
            .then(() => console.log('loaded game data from:', p))
            .catch((err) => {
                paths.reset();
                paths.saveToStorage();
                reportError;
            });
    }

    win.on('page-title-updated', (e) => e.preventDefault());
    paths.updateTitle();

    // ask before closing when you have unsaved changes
    win.on('close', function (event) {
        event.preventDefault();
        checkUnsavedThen(() => {
            createLauncherWindow();
            win.destroy();
        }, 'closing bitsy-savior');
    });

    // open links in a default browser instead of making new electron windows
    win.webContents.on('new-window', (event, url) => {
        event.preventDefault();
        shell.openExternal(url)
            .catch(console.error);
    });
}

ipcMain.on('feature-status', (event, featureStatus) => {
    console.log('recieved feature status');
    console.log(featureStatus);

    // enable and disable menu items according to available features
    const fileItems = Menu.getApplicationMenu().items.find(item => item.label === 'File').submenu.items;
    fileItems.forEach(item => {
        if (item.label === 'Open') {
            item.enabled = Boolean(featureStatus['open files in editor']);
        } else if (['Patch game data', 'Export game data', 'Patch and export', 'Patch game data in...', 'Export game data to...'].indexOf(item.label) !== -1) {
            item.enabled = Boolean(featureStatus['save data to files']);
        } else if (item.label === 'Save as new html...') {
            item.enabled = Boolean(featureStatus['save as new html']);
        }
    });
});

ipcMain.on('save-file', (event, fileName, fileData) => {
    if (fileName.endsWith('.html')) {
        saveNewHtml(fileData);
    } else if (fileName.endsWith('.bitsy')) {
        exportData(true);
    }
});

ipcMain.on('mark-unsaved', () => {
    paths.markUnsaved();
});

ipcMain.on('reset-game-data', (event, bitsyCallbackName) => {
    console.log('reset-game-data was raised');
    checkUnsavedThen(() => {
        paths.reset();
        paths.lastSavedAlone = null;
        paths.saveToStorage();
        event.reply('call', bitsyCallbackName);
    }, 'resetting game data');
});

ipcMain.on('show-error-message', (event, errMessage) => {
    console.error(errMessage);
    dialog.showErrorBox('Error', errMessage);
});

ipcMain.on('autosave', () => {
    if (!(paths.patch || paths.export)) return;
    console.log('autosaving...');
    tryPatchAndExport(paths.patch, paths.export)
        .then(console.log)
        .catch(reportError);
});
