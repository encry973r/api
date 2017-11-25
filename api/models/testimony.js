var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var testimonySchema = new Schema({
	testifier: String,
	testimony: String
});

var Testimony = mongoose.model('Testimony', testimonySchema);
module.exports = Testimony;