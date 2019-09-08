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
  checkUnsavedThen
} = require('./src/utils');
const menu = require('./src/menu');

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

  win.on('page-title-updated', (e) => e.preventDefault());
  paths.updateTitle();
  paths.setFromStorage();

  Menu.setApplicationMenu(menu);

  // ask before closing when you have unsaved changes
  win.on('close', function(event) {
    event.preventDefault();
    checkUnsavedThen(() => {
      paths.saveToStorage();
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

ipcMain.on('reset-game-data', (event, bitsyCallbackName) => {
  console.log('reset-game-data was raised');
  checkUnsavedThen(() => {
    paths.reset();
    event.reply('call', bitsyCallbackName);
  }, 'resetting game data');
});

ipcMain.on('autosave', () => {
  if (!(paths.patch || paths.export)) return;
  console.log('autosaving...');
  tryPatchAndExport(paths.patch, paths.export)
    .then(console.log)
    .catch(err => {
      console.error(err);
      dialog.showErrorBox(err.name, err.stack);
    });
});

app.on('ready', createWindow);
