const {
  app,
  BrowserWindow,
  Menu,
  MenuItem,
  dialog
} = require('electron');

global.gameHtmlPath = 'test/game.html';
global.bitsyDataPath = 'test/data.bitsy';

function createWindow () {
  const { screen } = require('electron');
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const win = new BrowserWindow({
    width: width,
    height: height,
    fullscreenWindowTitle: true,
    webPreferences: {
      nodeIntegration: true,
      preload: require.resolve('./src/bitsy-savior')
    }
  })
  win.loadFile('src/bitsy/editor/index.html');
  win.webContents.openDevTools();
  win.on('page-title-updated', (e) => e.preventDefault());

  // TODO: make a function to get status string for window title
  win.setTitle(`${gameHtmlPath}; ${bitsyDataPath}`);

  // TODO: replace with a new menu from template
  const menu = Menu.getApplicationMenu();
  const fileMenu = menu.items.find(i => i.label === 'File');
  const saveCommand = new MenuItem({
    click: getSavePathFromDialog,
    type: 'normal',
    label: 'Save',
    accelerator: 'CommandOrControl+S'
  });
  fileMenu.submenu.append(saveCommand);
  Menu.setApplicationMenu(menu);
}

async function getSavePathFromDialog (event, focusedWindow, focusedWebContents) {
  console.log('clicked on file dialog option');
  // TODO: attach dialog to window
  // showSaveDialog returns a promise that resolves into filepath and whether dialog was canceled
  // dialog title doesn't show up on macos
  console.log(await dialog.showSaveDialog({ title: 'choose html file where you wish to update game data' }));
}

// TODO: make a whole new menu from a template to use,
// instead of electron's default one. do the template in a separate module
// Menu.setApplicationMenu(thatNewMenu);
app.on('ready', createWindow);
