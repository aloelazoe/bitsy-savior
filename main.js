const {
  app,
  BrowserWindow,
  Menu,
  MenuItem,
  dialog
} = require('electron');

const paths = global.paths = {};
paths.patch = 'test/game.html';
paths.export = 'test/data.bitsy';

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
  win.setTitle(`${paths.patch}; ${paths.export}`);

  // SET UP NEW MENU ITEMS
  // TODO: replace with a new menu from template
  const menu = Menu.getApplicationMenu();
  const fileMenu = menu.items.find(i => i.label === 'File');
  [
    new MenuItem({
      label: 'Patch game data',
      accelerator: 'CommandOrControl+D',
      type: 'normal',
      click: async function() {
        // TODO: validate patch path, only accept valid html with bitsy-data element
        if (!paths.patch) paths.patch = await dialog.showOpenDialog() || paths.patch;
        tryPatch(paths.patch);
      },
    }),
    new MenuItem({
      label: 'Export game data',
      accelerator: 'CommandOrControl+E',
      type: 'normal',
      click: async function() {
        // TODO: when setting new export path validate it first: confirm overwrite if the file already exists
        if (!paths.export) paths.export = await dialog.showSaveDialog() || paths.export;
        tryExport(paths.export);
      },
    }),
    new MenuItem({
      label: 'Patch game data in...',
      accelerator: 'CommandOrControl+Shift+D',
      type: 'normal',
      click: async function() {
        // TODO: validate patch path, only accept valid html with bitsy-data element
        paths.patch = await dialog.showOpenDialog() || paths.patch;
        tryPatch(paths.patch);
      },
    }),
    new MenuItem({
      label: 'Export game data to...',
      accelerator: 'CommandOrControl+Shift+E',
      type: 'normal',
      click: async function() {
        // TODO: when setting new export path validate it first: confirm overwrite if the file already exists
        paths.export = await dialog.showSaveDialog() || paths.export;
        tryExport(paths.export);
      },
    }),
    new MenuItem({
      label: 'Patch & export',
      accelerator: 'CommandOrControl+S',
      type: 'normal',
      click: async function() {
        // call respective menus somehow? or make a function for serializing the world at the same time for both?
      },
    }),
  ].forEach(Menu.prototype.append, fileMenu.submenu);
  Menu.setApplicationMenu(menu);
}

async function tryPatch(p) {
  if (!p) return;
  console.log('patching game data in ', p);
  // TODO: actually patch game data
}

async function tryExport(p) {
  if (!p) return;
  console.log('exporting game data to ', p);
  // TODO: actually export game data
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
