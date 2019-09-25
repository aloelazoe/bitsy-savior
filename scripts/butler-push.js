const path = require('path');
const { spawnSync } = require('child_process');
const fse = require('fs-extra');

const configs = {
  mac: [{
    buildPath: './build/bitsy-savior-darwin-x64',
    appPath: './build/bitsy-savior-darwin-x64/bitsy-savior.app/Contents/Resources/app',
    channel: 'aloelazoe/bitsy-savior:mac-64',
  }],
  linux: [{
    buildPath: './build/bitsy-savior-linux-x64',
    appPath: './build/bitsy-savior-linux-x64/resources/app',
    channel: 'aloelazoe/bitsy-savior:linux-64',
  }],
  windows: [
    {
      buildPath: './build/bitsy-savior-win32-x64',
      appPath: './build/bitsy-savior-win32-x64/resources/app',
      channel: 'aloelazoe/bitsy-savior:windows-64',
    },
    {
      buildPath: './build/bitsy-savior-win32-ia32',
      appPath: './build/bitsy-savior-win32-ia32/resources/app',
      channel: 'aloelazoe/bitsy-savior:windows-32',
    }
  ]
};

let version;
try {
  version = fse.readJsonSync('./package.json').version;
} catch (err) {
  if (err.code === 'ENOENT') console.error("couldn't find ./package.json");
  console.error("the version can't be determined\nbutler will assign version number on its own when pushing the builds");
}

// the argument should be an array of objects where each object has buildPath, channel and optionally appPath properties
function butlerPush (configSet) {
  configSet.forEach((c) => {
    // add butler-channel.txt file in the build folder before pushing. it can be used to check for updates later
    if (!c.appPath) {
      console.log("couldn't create butler-channel.txt file because appPath wasn't specified");
    } else {
      try {
        fse.writeFileSync(path.join(c.appPath, 'butler-channel.txt'), c.channel);
      } catch (err) {
        console.error(err.message);
      }
    }

    // add .itch.toml manifest file
    try {
      fse.copySync('itch.toml', path.join(c.buildPath, '.itch.toml'));
    } catch (err) {
      console.error(err.message);
    }

    // run butler command to push the build
    spawnSync(
      'butler',
      [ 'push', c.buildPath, c.channel, ...(version ? ['--userversion', version] : []) ],
      {
        encoding: 'utf8',
        shell: true,
        // this will channel butler's status messages to this script's own standard output
        stdio: 'inherit',
      });
  });
}

if (process.argv.length < 3) {
  console.log(`possible arguments:`);
  Object.keys(configs).forEach((arg) => {
    console.log(`  ${arg}`);
  });
  console.log('  all');
}

process.argv.forEach((arg) => {
  if (arg === 'all') {
    // array.prototype.flat isn't yet supported in node lts version, going to use spread and concat
    butlerPush([].concat(...Object.values(configs)));
  } else if (Object.keys(configs).includes(arg)) {
    butlerPush(configs[arg]);
  }
});
