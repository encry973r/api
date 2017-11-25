var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var complaintSchema = new Schema({
	sender: String,
	subject: String,
	content: String
});

var Complaint = mongoose.model('Complaint', complaintSchema);
module.exports = Complaint;