const {
    app,
    BrowserWindow,
    Menu,
    dialog,
    ipcMain,
    shell
} = require('electron');
const paths = require('./paths');
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

    Menu.setApplicationMenu(menu);

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

ipcMain.on('save-file', (event, fileName, fileData) => {
    if (fileName.endsWith('.html')) {
        saveNewHtml(fileData);
    } else if (fileName.endsWith('.bitsy')) {
        exportData(true);
    }
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
