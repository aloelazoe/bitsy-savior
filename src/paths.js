const storage = require('./storage');

const paths = global.paths = {
    _patch: { value: null, unsaved: false },
    _export: { value: null, unsaved: false },
    lastSavedAlone: null,
    editorPatch: null,
    get patch() {
        return this._patch.value;
    },
    set patch(val) {
        this._patch.value = val;
        this.updateTitle();
    },
    get export() {
        return this._export.value;
    },
    set export(val) {
        this._export.value = val;
        this.updateTitle();
    },
    markUnsaved: function (opts = { patch: true, export: true }) {
        if (opts.hasOwnProperty('patch')) this._patch.unsaved = opts.patch;
        if (opts.hasOwnProperty('export')) this._export.unsaved = opts.export;
        this.updateTitle();
    },
    get unsavedChanges() {
        return (this._patch.value && this._patch.unsaved) || (this._export.value && this._export.unsaved);
    },
    reset: function () {
        this._patch = { value: null, unsaved: false };
        this._export = { value: null, unsaved: false };
        this.lastSavedAlone = null;
        this.updateTitle();
    },
    saveToStorage: function () {
        global.storedData.editors[global.storedData.editorIndex].paths = this.serialize();
        storage.save(global.storedData);
    },
    serialize: function (params) {
        return {
            _patch: this._patch,
            _export: this._export,
            lastSavedAlone: this.lastSavedAlone,
            editorPatch: this.editorPatch
        }
    },
    serializeEmpty (){
        return {
            _patch: { value: null, unsaved: false },
            _export: { value: null, unsaved: false },
            lastSavedAlone: null,
            editorPatch: null
        }
    },
    setFromStorage: function () {
        const storedPaths = global.storedData.editors[global.storedData.editorIndex].paths;
        if (!storedPaths) return;
        Object.assign(this, storedPaths);
        this.updateTitle();
    },
    updateTitle: function () {
        if (global.bitsyWindow) {
            const p = (this._patch.value || '(File -> Patch game data)');
            const e = (this._export.value || '(File -> Export game data)');
            const pDot = this._patch.value && this._patch.unsaved ? '•' : '';
            const eDot = this._export.value && this._export.unsaved ? '•' : '';
            global.bitsyWindow.setTitle(`Patch: ${p}${pDot}   Export: ${e}${eDot}`);
        }
    }
};

module.exports = paths;
