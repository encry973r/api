var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var passcodeSchema = new Schema({
	code: String,
	privilege: String,
	used: Boolean
});

var AdminPasscode = mongoose.model('AdminPasscode', passcodeSchema);
module.exports = AdminPasscode;