// experimenting with possible compatibility fixes

module.exports = {
    'open files in editor': [
        {
            // doesn't make sense to bother with bitsy hd though,
            // github version has its exports broken anyways
            name: 'open files in bitsy hd',
            requiredFunctions: ['on_bitsy_x2_data_change'],
            requiredElementIds: ['bitsy_x2_data'],
            init: function () {
                window.tryLoadingGameData = function (data) {
                    const oldData = document.getElementById("bitsy_x2_data").value;
                    try {
                        document.getElementById("bitsy_x2_data").value = data;
                        window.on_bitsy_x2_data_change();
                    } catch (err) {
                        document.getElementById("bitsy_x2_data").value = oldData;
                        window.on_bitsy_x2_data_change();
                        const errMessage = 'Game data is invalid\n' + err.stack;
                        return errMessage;
                    }
                };
            }
        }
    ]
}
