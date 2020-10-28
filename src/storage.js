const fse = require('fs-extra');
const path = require('path');
const {
    app
} = require('electron');

const storage = {
    _path: path.join(app.getPath('userData'), 'storage.json'),
    // todo: maybe just make it an interface to serialize global.storedData?
    read: function () {
        try {
            const storageObj = fse.readJsonSync(this._path);
            return storageObj;
        } catch {
            fse.outputJsonSync(this._path, {});
            return {};
        }
    },
    save: function(data) {
        fse.outputJsonSync(this._path, data, {spaces: 4});
    }
}

module.exports = storage;
