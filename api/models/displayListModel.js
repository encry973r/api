var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var displayListSchema = new Schema({
	state: String,
	flag: String
});

var Displaylist = mongoose.model('Displaylist', displayListSchema);
module.exports = Displaylist;