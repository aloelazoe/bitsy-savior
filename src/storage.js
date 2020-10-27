const fse = require('fs-extra');
const path = require('path');
const {
    app
} = require('electron');

const storage = {
    _path: path.join(app.getPath('userData'), 'storage.json'),
    _getStorageObj: function () {
        try {
            const storageObj = fse.readJsonSync(this._path);
            return storageObj;
        } catch {
            fse.outputJsonSync(this._path, {});
            return {};
        }
    },
    get: function (name) {
        const storageObj = this._getStorageObj();
        return storageObj[name];
    },
    set: function (name, value) {
        const storageObj = this._getStorageObj();
        storageObj[name] = value;
        fse.outputJsonSync(this._path, storageObj);
    },
}

module.exports = storage;
