const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  ipcMain,
  shell
} = require('electron');
const paths = require('./src/paths');
const {
  tryPatchAndExport,
  checkUnsavedThen,
  reportError,
  saveNewHtml,
  exportData,
  loadGameDataFromFile
} = require('./src/utils');
const menu = require('./src/menu');
const { checkUpdates } = require('./src/check-updates');

global.autosave = false;

function createWindow() {
  const { screen } = require('electron');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = global.bitsyWindow = new BrowserWindow({
    width: width,
    height: height,
    fullscreenWindowTitle: true,
    webPreferences: {
      nodeIntegration: true,
      preload: require.resolve('./src/injector')
    }
  })
  win.loadFile('src/bitsy/editor/index.html');
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
  win.on('close', function(event) {
    event.preventDefault();
    checkUnsavedThen(() => {
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

app.on('ready', () => {
  createWindow();
  checkUpdates();
});
