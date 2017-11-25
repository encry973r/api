var mongoose = require('mongoose');
//var Schema = mongoose.Schema;
var displaylists = require('../api/models/displayListModel');

//mongoose.Promise = global.Promise;

displaylists.update({ state : "hide"}, {$set: {state: "show"}}, function(err, res){
	if(err){
		console.log(err);
		return;
	}
	if(res){
		console.log(res);
	}else{
		console.log('failed');
	}
	
});