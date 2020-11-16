const {
    app,
    BrowserWindow,
    Menu,
    dialog,
    ipcMain,
    shell
} = require('electron');
const features = require('./features');
const storage = require('./storage');
const fse = require('fs-extra');
const normalizeUrl = require('normalize-url');
const path = require('path');
const url = require('url');
const {
    tryPatchAndExport,
    checkUnsavedThen,
    reportError,
    saveNewHtml,
    exportData,
    loadGameDataFromFile,
    tryLoadingEditorPatch
} = require('./utils');
const menu = require('./menu');
const { checkUpdates } = require('./check-updates');

const paths = require('./paths');
paths.onPatchChanged = function () {
    // enable or disable 'run game' menu item depending on
    // whether there is an html file for patching that can be run

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
let currentPermissions = {};

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
        backgroundColor: '#fff0f5',
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
    }).then((result) => {
            if (result.canceled || result.filePaths.length === 0) return;
            const newPath = result.filePaths[0];
            switch (arg) {
                case 'current':
                    const curEditor = global.storedData.editors[global.storedData.editorIndex];
                    console.log(`setting the path of the current editor ${curEditor.name} to ${newPath}`);
                    curEditor.editorPath = newPath;
                    break;

                case 'new':
                    console.log(`setting the path of the new editor ${global.newEditor.name} to ${newPath}`);
                    global.newEditor.editorPath = newPath;
                    break;

                default:
                    break;
            }
            event.reply('setEditorPathReply');
        })
});

ipcMain.on('saveData', () => {
    storage.save(global.storedData);
});

ipcMain.on('runEditor', async () => {
    const currentEditor = global.storedData.editors[global.storedData.editorIndex];
    let editorUrl;
    
    if (currentEditor.type === 'web') {
        editorUrl = normalizeUrl(currentEditor.editorPath);
    } else {
        let editorPath;
    
        if (currentEditor.type === 'builtinVanilla') {
            editorPath = path.join(app.getAppPath(), 'src/bitsy/editor/index.html');
        } else {
            editorPath = currentEditor.editorPath;
        }

        // check if file still exists first
        const exists = await fse.pathExists(editorPath);
        if (!exists) {
            console.log(`file ${editorPath} doesn't exist`);
            dialog.showMessageBox({
                type: 'info',
                buttons: [],
                title: 'bitsy-savior',
                message: `can't open this editor because the file doesn't exist 😿`,
                detail: editorPath,
            });
            return;
        }
    
        editorUrl = url.format({
            protocol: 'file',
            slashes: true,
            pathname: editorPath,
        })
    }

    await createEditorWindow(editorUrl);
});

async function createEditorWindow(editorUrl) {
    const { screen } = require('electron');
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    // reset permissions
    currentPermissions = {};

    if (global.bitsyWindow && !global.bitsyWindow.isDestroyed()) {
        console.log('bitsy editor is already running!');
        global.bitsyWindow.show();
        return;
    }

    const win = global.bitsyWindow = new BrowserWindow({
        width: width,
        height: height,
        fullscreenWindowTitle: true,
        show: false,
        webPreferences: {
            nodeIntegration: false,
            enableRemoteModule: false,
            allowRunningInsecureContent: false,
            contextIsolation: true,
            sandbox: true,
            preload: require.resolve('./preload'),
        }
    })

    win.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
        // permission String - Enum of 'media', 'geolocation', 'notifications', 'midiSysex', 'pointerLock', 'fullscreen', 'openExternal'

        console.log(`${webContents.getURL()} requested a permission for ${permission}`);

        // allow pointer lock and fullscreen without asking
        if (permission === 'pointerLock' || permission === 'fullscreen') {
            callback(true);
        } else {
            // ask for all other permissions and remember choices for the current session
            // bitsy editors aren't supposed to ask for them but it might become needed
            // if folks find ways how bitsy savior can be useful with other tools
            if (currentPermissions.hasOwnProperty(permission)) {
                callback(currentPermissions[permission]);
                console.log(`${currentPermissions[permission] && 'allowed' || "didn't allow"} ${webContents.getURL()} access to ${permission}`);
            } else {
                // open a simple dialog asking about requested permission and remember choices for current session
                dialog.showMessageBox({
                    type: 'question',
                    buttons: ['Allow', "Don't allow"],
                    defaultId: 1,
                    message: `${webContents.getURL()} requested a permission for ${permission}`,
                    cancelId: 1,
                    noLink: true
                }).then(({ response: buttonId }) => {
                    let allow = false;
                    if (buttonId === 0) allow = true;
                    currentPermissions[permission] = allow;
                    callback(allow);
                    console.log(`${allow && 'allowed' || "didn't allow"} ${webContents.getURL()} access to ${permission}`);
                });
            }
        }
    });

    win.on('page-title-updated', (e) => e.preventDefault());

    // exit pointer lock or fullscreen when pressing escape
    win.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyUp' && input.key === 'Escape') {
            win.webContents.executeJavaScript('if (document.pointerLockElement) {document.exitPointerLock()} else if (document.fullscreenElement) {document.exitFullscreen()}');
        }
    })

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

    try {
        console.log('loading editor url ' + editorUrl);
        await win.webContents.loadURL(editorUrl);
        
        // we get here if the page has loaded without errors
        win.show();
        // set menu before loading paths
        Menu.setApplicationMenu(menu);
        paths.setFromStorage();

        // after loading paths, execute an editor patch if it was specified
        await tryLoadingEditorPatch().catch(reportError);

        const featureStatus = await features.init().catch(reportError);
        console.log('feature status:');
        console.log(featureStatus);

        updateMenuItems(featureStatus);

        if (global.launcherWindow && !global.launcherWindow.isDestroyed()) {
            launcherWindow.destroy();
        }
    } catch (err) {
        console.log('an error occured when trying to load ' + editorUrl);
        console.error(err);

        dialog.showMessageBox({
            type: 'info',
            buttons: [],
            title: 'bitsy-savior',
            message: 'an error occured when trying to load the editor',
            detail: editorUrl,
        });
        win.close();
    }
}

function updateMenuItems(featureStatus) {
    // enable and disable menu items according to available features
    const fileItems = Menu.getApplicationMenu().items.find(item => item.label === 'File').submenu.items;
    fileItems.forEach(item => {
        if (item.label === 'Open') {
            item.enabled = Boolean(featureStatus['open']);
        } else if (['Patch game data', 'Export game data', 'Patch and export', 'Patch game data in...', 'Export game data to...'].indexOf(item.label) !== -1) {
            item.enabled = Boolean(featureStatus['get-data']);
        } else if (item.label === 'Save as new html...') {
            item.enabled = Boolean(featureStatus['save-new']);
        }
    });

    // if opening files feature is working, load game data from save paths
    if (Boolean(featureStatus['open'])) {
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
        paths.updateTitle();
    }
};

ipcMain.on('save-new-file', (event, fileName, fileData) => {
    if (fileName.endsWith('.html')) {
        saveNewHtml(fileData);
    } else if (fileName.endsWith('.bitsy')) {
        exportData(true);
    }
});

ipcMain.on('mark-unsaved', () => {
    paths.markUnsaved();
});

ipcMain.handle('reset-game-data', () => {
    console.log('reset-game-data was raised');
    checkUnsavedThen(() => {
        paths.reset();
        paths.lastSavedAlone = null;
        paths.saveToStorage();
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
