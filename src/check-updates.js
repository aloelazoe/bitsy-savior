const path = require('path');
const fse = require('fs-extra');
const {
  app,
  dialog,
  shell
} = require('electron');
const fetch = require('node-fetch');
const compareVersions = require('compare-versions');

let butlerTarget;
let butlerChannel;

function checkUpdates() {
  const itchApp = process.argv.indexOf('itchApp') !== -1;
  if (itchApp) console.log(`${app.getName()} was launched by itch app`);

  // try reading butler-channel.txt file
  // it should be added by butler-push.js script
  fse.readFile(path.join(app.getAppPath(), 'butler-channel.txt'), 'utf8')
    .then(data => {
      [butlerTarget, butlerChannel] = data.split(':');
      console.log('checking if new version is available');
      const url = `https://itch.io/api/1/x/wharf/latest?target=${butlerTarget}&channel_name=${butlerChannel}`;
      console.log(url);
      return fetch(url);
    })
    .then(responseObj => {
      return responseObj.text();
    })
    .then(response => {
      console.log('version check response:', response);
      const { latest: latestVerstion } = JSON.parse(response);
      console.log(`app version: ${app.getVersion()}, latest verstion: ${latestVerstion}`);
      if (compareVersions(app.getVersion(), latestVerstion) !== -1) {
        console.log(`${app.getName()} is up to date`);
        return;
      }
      console.log('new version is available on itch.io');
      if (!itchApp) {
        if (dialog.showMessageBoxSync({
          type: 'info',
          message: `New version is available on itch.io`,
          buttons: ['Cancel', 'Open download page'],
          noLink: true,
          cancelId: 0,
          defaultId: 1
        }) === 1) {
          // open itch.io page
          const [user, game] = butlerTarget.split('/');
          const url = `https://${user}.itch.io/${game}`;
          console.log(`opening ${url}`);
          return shell.openExternal(url);
        }
      } else {
        dialog.showMessageBoxSync({
          type: 'info',
          message: `New version is available`,
          detail: `you can right click ${app.getName()} icon in itch.io app to check for updates and install them`,
          buttons: ['Ok'],
          noLink: true,
          cancelId: 0,
          defaultId: 0
        });
      }
    })
    .catch(console.error);
}

exports.checkUpdates = checkUpdates;
