const { app, BrowserWindow } = require('electron');

function createWindow () {
  let win = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      preload: require.resolve('./src/bitsy-savior')
    }
  })

  win.loadFile('src/bitsy/editor/index.html');
  win.webContents.openDevTools();
}

app.on('ready', createWindow);
