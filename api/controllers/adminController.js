//LEsson of life-----------NEVER USE CAPITAL LETTER(S) WHEN NAMING YOUR COLLECTION IN THE DATABASE. NEEEEEVEEEEEEEEEEEEEEEEEEER!!!!!!!!!!!!!
//findOneAndRemove() removes the user himself
const mongoose = require('mongoose');
const passport = require('passport');
const User = mongoose.model('User');
var AdminPasscode = require('../models/passcodeModel');
//const AdminPasscode = mongoose.model('AdminPasscode');
const Complaint = require('../models/supportModel');
const Displaylist = mongoose.model('Displaylist');
const Testimony = require('../models/testimony');
var fs = require('fs');

//const Displaylist = require('../models/displayListModel');
const bcrypt = require('bcryptjs');

/////----------------------------------------------------PRODUCTION CONTROLLERS------------------------------------------------------------------------

//get_admin_register_form
exports.get_admin_register_form = function(req, res, next){
	res.render('azbycx/register');
	next();
}

//alter_passcode_state
function alter_passcode_state(privilege){
	AdminPasscode.update({privilege: privilege}, {$set: {used: true}}, function(err, updated){
		if(err){
			console.log(err);
			return;
		}
		if(updated){
			return 'updated';
		}else{
			return 'err';
		}
	});
}

//register_admin
exports.register_admin = function(req, res, next){
	const username = req.body.username;
	const password = req.body.password;
	const password2 = req.body.password2;
	const code = req.body.code;

	req.checkBody('username', 'Username is required').notEmpty();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(password);


	let errors = req.validationErrors();

	if(errors){
		res.render('azbycx/register', {
			errors: errors
		});
	}else{

		//Check passcode to see if its for admin or superAdmin.
		AdminPasscode.findOne({code: code}, function(err, pass){			////////////////passcode tag begins
			if(err){
				console.log(err);
				return;
			}

			var privilege = pass.privilege;
			var used = pass.used;
			console.log({pass: pass});

			if(!pass){/////////////////////////////////////two
				req.flash('danger', 'Use this route instead! Because the passcode does not exist');
				res.redirect('/users/register');
				return;

				////////////////////////////////////////one*/
			}else{ /////////////////////////////////////////////two

				if(privilege == 'superAdmin' && used == false){////////////one
					var newUser = new User({
						username: username,
						password: password,
						superAdmin: true,
						admin: true
						});
					var altered = alter_passcode_state(privilege);
					console.log({status: altered});
				}
				if(privilege == 'admin' && used == false){
					var newUser = new User({
						username: username,
						password: password,
						superAdmin: false,
						admin: true
						});
					var altered = alter_passcode_state(privilege);
					console.log({status: altered});
				}
				if(used == true){
					req.flash('danger', 'Use this route instead! Because the passcode has been used!');
					res.redirect('/users/register');
					return; //always use return when handling negatives
				}

				User.findOne({username: newUser.username}, function(err, user){
					if(err) throw err;
					if(user){
						req.flash('info', 'Username already taken. Please try another');
						res.render('azbycx/register', {admin: newUser});
						return;
					}

					bcrypt.genSalt(10, function(err, salt){
						if(err) console.log(err);
					  	bcrypt.hash(newUser.password, salt, function(err, hash){
							if(err){
								console.log(err);
							}
							newUser.password = hash;
							newUser.save(function(err, newUsr){
								if(err){
									console.log(err);
									return;
								}else{
									req.flash('success', 'You are now registered and can log in');
									res.redirect('/medusa123/login');
									next();
								}
							});
						});
					});

				});
			}
		});		////////////////////////passcode tag ends*/
	}
};

//get_admin_login_form
exports.get_admin_login_form = function(req, res, next){
	//always use admin since since its the admin login template we are after!
	res.render('azbycx/login');
	next();
}

//ACTUAL USAGE OF PASSPORT MIDDLEWARE
exports.login_admin = function(req, res, next){
	 //ACTUAL USAGE OF PASSPORT MIDDLEWARE
	 	 	passport.authenticate('local', {
	 		successRedirect: '/medusa123/dashboard',
	 		failureRedirect: '/users/login',
	 		failureFlash: 'wrong username and password combination!'
	 		 })(req, res, next);
	 }

//logout_admin
exports.logout_admin = function(req, res, next){
	req.logout();
	req.flash('success', 'You are logged out');
	//its important that you don't use 'admin/login', because it would redirect to '/admin/admin/login'
	res.redirect('/medusa123/login');
}

//get_admin_dashboard
exports.get_admin_dashboard = function(req, res, next){
	//const amountRemaining = parseInt(req.user.amountRemaining);
	const amountReceived = parseInt(req.user.amountReceived);
	const amountReserved = parseInt(req.user.amountReserved);
	const amountRemaining = parseInt(amountReserved*1.5 - amountReceived);

	res.render('azbycx/dashboard', {reserved: amountReserved, received: amountReceived, remainder: amountRemaining});
	next();
}

//get_admin_reservation_list
exports.get_admin_reservation_list = function(req, res, next){

		//use findOne if a single object is needed and not an array of object. If only 'find' is used, an array would be returned. Hence the use of index 
		//to assess the objects present even if only one object is present!
		Displaylist.findOne({flag: 'flag'}, function(err, obj){

			if(err){
				console.log(err);
				return;
			}

			if(!obj){
				console.log({msg: obj});
			}

			if(obj){
				console.log(obj);
				User.find({amountRemaining: {'$ne': 0, '$gt': 0}}, function(err, users){
					if(err){
						console.log(err);
						return;
					}else{
						res.render('azbycx/reservation', {reserves: users, user: req.user, current_state: obj});
						next();
					}

				});
			}
	});
}

//get_admin_profile
exports.get_admin_profile = function(req, res, next){
	res.render('azbycx/profile', {bankDetails: req.user.bankDetails, profileUpdated: req.user.profileUpdated});
	next();
}

//update_admin_profile
exports.update_admin_profile = function(req, res, next){
	const profileUpdated = req.user.profileUpdated;
	const email = req.body.email;

	if(email){
		
		const phone = req.body.phone;
		const acctFirstName = req.body.acctFirstName;
		const acctLastName = req.body.acctLastName;
		const accountHolder = acctFirstName + ' ' + acctLastName;
		const acctNumber = req.body.acctNumber;
		const bankname = req.body.bankname;
		const id = req.user._id;
		const firstname = req.body.firstname;
		const lastname = req.body.lastname;

		User.update({_id: id}, {$set: {email: email, phone: phone, firstname: firstname, lastname: lastname, profileUpdated: true, bankDetails: {
										accountHolder: accountHolder, bankname: bankname, accountNumber: acctNumber}}})
			.then(function(err, updated){
				//console.log(updated);
				if(err){
					console.log(err);
					return ;
				}

			});
	}else{
		const acctFirstName = req.body.acctFirstName;
		const acctLastName = req.body.acctLastName;
		const accountHolder = acctFirstName + ' ' + acctLastName;
		const acctNumber = req.body.acctNumber;
		const bankname = req.body.bankname;
		const id = req.user._id;
		const phone = req.body.phone;

		if(phone == ''){
			User.update({_id: id}, {$set: { bankDetails: {
											accountHolder: accountHolder, bankname: bankname, accountNumber: acctNumber}}})
				.then(function(err, updated){
					if(err){
						console.log(err);
						return;
					}
				});
		}else{

			User.update({_id: id}, {$set: { phone: phone, bankDetails: {
											accountHolder: accountHolder, bankname: bankname, accountNumber: acctNumber}}})
				.then(function(err, updated){
					if(err){
						console.log(err);
						return;
					}
				});
		}
	}

	req.flash('success', 'Profile Updated...');
	res.redirect('/medusa123/profile');
	next();
}


//get_admin_transactions
exports.get_admin_transactions = function(req, res, next){

	var userid = req.user._id;

	User.findById(userid, function(err, user){
		if(err){
			console.log(err);
			return;
		}


		var date = new Date();
		var now = date.getTime();

		var incomings = user.incomingReservations;

		for(var index = 0; index < incomings.length; index++){
			incomings[index].deadline = parseInt((incomings[index].deadline - now)/60000);	//convert each deadline to minutes
		}
		
		res.render('azbycx/transactions', {incoming: incomings});
		next();
	});
}

//approve_admin_downline
exports.approve_admin_downline = function(req, res, next){
	const duname = req.body.duname;
	const approvalAmount = req.body.approvalAmount;
	const uplineId = req.body.myId;
	const coupleIndex= req.body.coupleIndex;	
	const coupleId = req.body.coupleId;
	const imageName = req.body.imageName;
	//const uplineIndex = req.body.uplineIndex; //not useful since mongoose helps us find the index using the '$' notation.

		//db.blog.update({"comments.author" : "John"}, {"$set" : {"comments.$.author" : "Jim"}})

		//changes the upline action status to 'Approved'. so the 'Approve' and 'Decline' buttons vanishes on rendering
	User.update({"incomingReservations.coupleId": coupleId}, {$set: {"incomingReservations.$.confirmation_flag" :  "Approved", "incomingReservations.$.imageName" :  "Approved", "incomingReservations.$.pop" :  "Approved"}}, function(err, updatedUpline){///**one******
			if(err){
				console.log(err);
				return;
			}

			if(!updatedUpline){
				console.log({msg: 'upline confirmation_flag state change failed!'});
				return;
			}
			
			if(updatedUpline){//**************************************two***********************************************************

					//log the result of the update. I.e the status. 'updated' contains the execution stats such as these "{ ok: 0, n: 0, nModified: 0 }"
				console.log({msg: updatedUpline});

				//Delete the image.
				fs.unlink("C:\\Users\\luser\\Pictures\\MEPN\\api\\public\\uploads\\"+imageName, function(err){
					if(err){
						console.log(err);
						return;
					}
					
					console.log({msg: 'image :' + imageName + ' was successfully deleted!'});
				});

				User.update({_id: uplineId}, {$inc: {amountReceived: approvalAmount}}, function(err, reducedAmountRemaining){
					if(err){
						console.log(err);
						return;
					}

					if(!reducedAmountRemaining){
						console.log({msg: 'upline amountRemaining reduction failed!'});
						return;
					}
					
					if(reducedAmountRemaining){//******************************three*******************************************************

						console.log({msg: reducedAmountRemaining});

						User.update({"outgoingReservations._id": coupleId}, {$set: {"outgoingReservations.$.confirmation_flag" :  "Approved",
									"outgoingReservations.$.pop" :  "Approved", "outgoingReservations.$.imageName" :  "Approved"}}, 
							function(err, updatedDownline){///*************************four***********************************************************************
							if(err){
								console.log(err);
								return;
							}

							if(!updatedDownline){
								console.log({msg: 'downline confirmation_flag state change failed!'});
							}

							if(updatedDownline){//************************************five*************************************************************************
								console.log({msg: updatedDownline});

								User.update({username: duname}, {$inc: {amountRemaining: approvalAmount*1.5, amountReserved: approvalAmount}}, function(err, amountUpdate){/////six********************

									if(err){
										console.log(err);
										return;
									}

									if(!amountUpdate){
										console.log({msg: 'downline amountRemaining increment failed!'});
									}else{
										console.log({msg: amountUpdate});
									}
						
								});//*************************************six*************************************************************************

							}//***************************************************five

							
						});////*******************************************four*********************************************************************



					}//******************************************three***********************************************************************
				});

				//changes the downline status to approved. so the 'Pending' text vanishes on rendering 
				
			}//********************************************two************************************************************************
		});///****************************one**************************************************************************************
	return res.send({msg: 'Payment approve success'});
}

//approve_declined_downline --- this is executed by the superAdmin himself!
//*************************************************************************************************************************
exports.approve_declined_downline = function(req, res, next){
	const duname = req.body.duname;
	const approvalAmount = req.body.approvalAmount;
	const uplineId = req.body.uplineId;
	const coupleIndex= req.body.coupleIndex;
	const coupleId = req.body.coupleId;
	const imageName = req.body.imageName;
	const uplineUsername = req.body.uplineUsername;
	var date = new Date();
	var now = date.getTime();
	var suspensionTime = now + (48*3600*1000); //48hrs suspension
	//const uplineIndex = req.body.uplineIndex; //not useful since mongoose helps us find the index using the '$' notation.

		//db.blog.update({"comments.author" : "John"}, {"$set" : {"comments.$.author" : "Jim"}})

		//changes the upline action status to 'Approved'. so the 'Approve' and 'Decline' buttons vanishes on rendering
	User.update({"incomingReservations.coupleId": coupleId},
		{$set: {suspended: true, suspensionTime: suspensionTime, "incomingReservations.$.confirmation_flag" :  "Approved", "incomingReservations.$.imageName" :  "Approved",
				"incomingReservations.$.pop" :  "Approved"},
		 $inc: {transactionsDeclined: -1}},
		 function(err, updatedUpline){///**one******
			if(err){
				console.log(err);
				return;
			}

			if(!updatedUpline){
				console.log({msg: 'upline confirmation_flag state change failed!'});
				return;
			}
			
			if(updatedUpline){//**************************************two***********************************************************

					//log the result of the update. I.e the status. 'updated' contains the execution stats such as these "{ ok: 0, n: 0, nModified: 0 }"
				console.log({msg: updatedUpline});

				//delete any message sent by upline
				Complaint.update({sender: uplineUsername}, {$pull: {sender: uplineUsername}}, function(err, result){
					if(err){
						console.log(err);
						return;
					}

					if(result){
						console.log({msg: 'Upline\'s message(s) deleted'});
					}else{
						console.log({msg: 'Upline probably didn\'t send a complain'});
					}

				});

				//Delete the image.
				fs.unlink("C:\\Users\\luser\\Pictures\\MEPN\\api\\public\\uploads\\"+imageName, function(err){
					if(err){
						console.log(err);
						return;
					}
					
					console.log({msg: 'image :' + imageName + ' was successfully deleted!'});

				});

				User.update({_id: uplineId}, {$inc: {amountReceived: approvalAmount}}, function(err, reducedAmountRemaining){
					if(err){
						console.log(err);
						return;
					}

					if(!reducedAmountRemaining){
						console.log({msg: 'upline amountRemaining reduction failed!'});
						return;
					}
					
					if(reducedAmountRemaining){//******************************three*******************************************************

						console.log({msg: reducedAmountRemaining});

						//delete any complaint sent by downline
						Complaint.update({sender: duname}, {$pull: {sender: duname}}, function(err, result){
							if(err){
								console.log(err);
								return;
							}
							
							if(result){
								console.log({msg: 'Downline\'s message(s) deleted'});
							}else{
								console.log({msg: 'Downline probably didn\'t send a complain'});
							}
						});

						User.update({"outgoingReservations._id": coupleId}, {$set: {"outgoingReservations.$.confirmation_flag" :  "Approved", 
																					"outgoingReservations.$.imageName" :  "Approved",
																					"outgoingReservations.$.pop" :  "Approved"}}, 
							function(err, updatedDownline){///*************************four***********************************************************************
							if(err){
								console.log(err);
								return;
							}

							if(!updatedDownline){
								console.log({msg: 'downline confirmation_flag state change failed!'});
							}

							if(updatedDownline){//************************************five*************************************************************************
								console.log({msg: updatedDownline});

								User.update({username: duname}, {$inc: {amountRemaining: approvalAmount*1.5, amountReserved: approvalAmount}}, function(err, amountUpdate){/////six********************

									if(err){
										console.log(err);
										return;
									}

									if(!amountUpdate){
										console.log({msg: 'downline amountRemaining increment failed!'});
										res.send({msg: 'Payment approval failed!'});
									}else{
										console.log({msg: amountUpdate});
										res.send({msg: 'Payment approve success'});
									}
						
								});//*************************************six*************************************************************************

							}//***************************************************five

							
						});////*******************************************four*********************************************************************



					}//******************************************three***********************************************************************
				});

				//changes the downline status to approved. so the 'Pending' text vanishes on rendering 
				
			}//********************************************two************************************************************************
		});///****************************one**************************************************************************************
	 
}

//*************************************************************************************************************************


// decline_admin_downline
exports.decline_admin_downline = function(req, res, next){
	/*const duname = req.body.duname;
	const approvalAmount = req.body.approvalAmount;
	const uplineId = req.body.myId;
	const coupleIndex= req.body.coupleIndex;*/
	const coupleId = req.body.coupleId;

			//changes the upline action status to 'Approved'. so the 'Approve' and 'Decline' buttons vanishes on rendering
			//Notice that the amount-remaining of the upline isn't restored even though he declined the transaction. The restoration lies in the hands
			//of the superAdmin when he chooses to do so!
	User.update({"incomingReservations.coupleId": coupleId},
		{$set: {"incomingReservations.$.confirmation_flag" :  "Declined"},
		$inc: {transactionsDeclined: 1}}, //increment the decline status by '1'. So that the superAdmin would have the final say on the matter!
		function(err, updatedUpline){
			if(err){
				console.log(err);
				return;
			}
			//log the result of the update. I.e the status. 'updated' contains the execution stats such as these "{ ok: 0, n: 0, nModified: 0 }"
			console.log({msg: updatedUpline});
			if(updatedUpline){

				//changes the downline status to approved. so the 'Pending' text vanishes on rendering 
				User.update({"outgoingReservations._id": coupleId}, {$set: {"outgoingReservations.$.confirmation_flag" :  "Declined"}}, 
					function(err, updatedDownline){////one
						if(err){
							console.log(err);
							return;
						}

						console.log({msg: updatedDownline});
				});////one
			}
		});
	return res.send({msg: 'Payment Decline success!'});
	
}

//The only reason for this function is to increment amount-remaining of upline upon confirmation by the superAdmin that the downline isn't serious
//as regards the payment he argued to have made or the downline is a blatant liar!
//decline_declined_downline
exports.decline_declined_downline = function(req, res, next){
	const duname = req.body.duname;
	const approvalAmount = req.body.approvalAmount;
	const uplineId = req.body.uplineId;
	const coupleIndex= req.body.coupleIndex;
	const coupleId = req.body.coupleId;
	const imageName = req.body.imageName;
	const uplineUsername = req.body.uplineUsername;
	var date = new Date();
	var now = date.getTime();
	var suspensionTime = now + 48*3600*1000; //48hrs suspension

		//decrement the decline status by '1'so as to prevent this document from being rendered the sencond time. This is bad if it happens
	User.update({_id: uplineId}, {$inc: {amountRemaining: approvalAmount, transactionsDeclined: -1}}, 
		function(err, updatedUpline){
			if(err){
				console.log(err);
				return;
			}

			User.update({"incomingReservations.coupleId": coupleId},
				{$set: {"incomingReservations.$.confirmation_flag" :  "Declined", "incomingReservations.$.imageName" :  "Declined",
						"incomingReservations.$.pop" :  "Declined"}},
				function(err, updatedUpline){
					if(err){
						console.log(err);
						return;
					}
					//Delete the image.
					fs.unlink("C:\\Users\\luser\\Pictures\\MEPN\\api\\public\\uploads\\"+imageName, function(err){
						if(err){
							console.log(err);
							return;
						}
						
						console.log({msg: 'image :' + imageName + ' was successfully deleted!'});
					});

					console.log({updated: updatedUpline});

					//delete any message sent by upline
					Complaint.update({sender: uplineUsername}, {$pull: {sender: uplineUsername}}, function(err, result){
						if(err){
							console.log(err);
							return;
						}

						if(result){
							console.log({msg: 'Upline\'s message(s) deleted'});
						}else{
							console.log({msg: 'Upline probably didn\'t send a complain'});
						}

					});


					//changes the downline status to Declined. so the 'Pending' text vanishes on rendering 
					User.update({"outgoingReservations._id": coupleId}, {$set: { suspended: true, suspensionTime: suspensionTime, "outgoingReservations.$.confirmation_flag" :  "Declined",
								"outgoingReservations.$.imageName" :  "Declined", "outgoingReservations.$.pop" :  "Declined" }}, 
						function(err, updatedDownline){////one
							if(err){
								console.log(err);
								return;
							}

							console.log({msg: updatedDownline});

							//delete any message sent by upline
							Complaint.update({sender: duname}, {$pull: {sender: duname}}, function(err, result){
								if(err){
									console.log(err);
									return;
								}

								if(result){
									console.log({msg: 'Downline\'s message(s) deleted'});
								}else{
									console.log({msg: 'Downline probably didn\'t send a complain'});
								}

							});
					});////one

					res.send({msg: 'Payment Decline success!'});
				});
		});
	
	
}

//get_all_registered_users
exports.get_all_registered_users = function(req, res, next){
	User.find({admin: false}, function(err, users){
		if(err){
			console.log(err);
			return;						//else return user object for manipulation
		}

		res.render('azbycx/allUsers', {users: users});
		next();	
	});
}

//get_all_registered_admins
exports.get_all_registered_admins = function(req, res, next){
	User.find({admin: true}, function(err, admins){
		if(err){
			console.log(err);
			return;						//else return user object for manipulation
		}

		console.log(req.user);
		
		res.render('azbycx/allAdmins', {admins: admins});
		next();

	});
}

/*update_admin_amount_remaining*/
exports.update_admin_amount_remaining = function(req, res, next){
	var amountInput = req.body.amountInput;
	var admin_id = req.body.admin_id;

	User.update({ _id: admin_id }, {$set: {amountRemaining: amountInput}}, function(err, updated){
		if(err){
			console.log(err);
			return;						//else return user object for manipulation
		}
		if(!updated){
			res.send({msg: 'Ooops! could not update amount Remaining!'});
			return;
		}else if(updated){
			res.send({msg: 'updated'});
			//next();
		}
	});
}

//get_all_complaints
exports.get_all_complaints = function(req, res, next){
	Complaint.find({}, function(err, complaints){
		if(err){
			console.log(err);
			return;
		}

		res.render('azbycx/complaints', {complaints: complaints});
		next();
	});
}

//publish_list
exports.publish_list = function(req, res, next){
	Displaylist.update({state: 'hide'}, {$set: {state: 'show'}}, function(err, updated){
		if(err){
			console.log(err);
			return;
		}

		/*if(updated){
			res.send({msg: 'success'});
			next();
		}else{
			res.send({msg: 'Oops! Something went wrong!'});
			next();
		}*/
		res.send({msg: 'success'});
		//next(); comment this out to prevent unneccessary hanging and err : POST http://localhost:5000/admin/publish net::ERR_CONTENT_LENGTH_MISMATCH
	});
}

//withdraw_list
exports.withdraw_list = function(req, res, next){
	Displaylist.update({state: 'show'}, {$set: {state: 'hide'}}, function(err, updated){
		if(err){
			console.log(err);
			return;
		}
		/*if(updated){
			res.send({msg: 'success'});
			next();
		}else{
			res.send({msg: 'Oops! Something went wrong!'});
			next();
		}*/
		res.send({msg: 'success'});
		//next(); comment this out to prevent unnecessary hanging and err : POST http://localhost:5000/admin/publish net::ERR_CONTENT_LENGTH_MISMATCH
	});
}

//get_all_declined_transactions
//so final decision can be taken by the admin!
exports.get_all_declined_transactions = function(req, res, next){
	//declinedAnyTransaction
	User.find({transactionsDeclined: {'$gt': 0}}, function(err, decliners){
		if(err){
			console.log(err);
			return;
		}

		res.render('azbycx/declinedTransactions', {decliners: decliners});
		next();
	})
}

//get_all_testimonies
exports.get_all_testimonies = function(req, res, next){
	Testimony.find({}, function(err, testimonies){
		if(err){
			console.log(err);
			return;
		}

		res.render('azbycx/testimonies', {testimonies: testimonies});
		next();
	});
}

//get_purge_page
exports.get_purge_page = function(req, res, next){
	res.render('azbycx/purge');
	next();
}

//purge
exports.purge = function(req, res, next){
	var status = '';

	User.find({admin: false}, function(err, users){////////////////////0
		var date = new Date();
		var now = date.getTime();

		users.map(function(user){////////////////////////////////////////////////////////////1
			var outgoings = user.outgoingReservations;

			if(outgoings != ''){////////////////////////////2
				var out, coupleId, upline, coupleIndex;

				for(var i = 0; i < outgoings.length; i++){
					if(outgoings.length - i == 1){
						//index = i; //get index of last array object
						out = outgoings[i];
						coupleId = out._id;
						upline = out.upline;
						coupleIndex = i;
					}
				}

				//make sure you put succeeding codes inside inside any loop whatsoever to prevent it from running again after completion of the needing runs! VIP!!!!
				//or you include an 'if-statement" inside it to stop the loop'
				if(user.purged == false && out.deadline < now && out.confirmation_flag == 'Pending'){///////////////////////////////3
					var downlineId = user._id;

					User.findOne({username: upline}, function(err, up){/////////////////////4
						if(err){
							console.log(err);
							return;
						}

						User.update({_id: downlineId}, {$set: {purged: true}, 
							$push: {"inbox": { downlineId: downlineId, uplineId: up._id,
											   message: 'A final review is on. The admin is looking into your transaction.'}}},
							function(err, success){/////////////////////5
								if(err){
									console.log(err);
									return;
								}

							console.log({success1: success})

							User.update({username: upline},
								{ $push: {"inbox":
										 {downlineId: downlineId,
										  uplineId: up._id,
										  message: 'A final review is on. The admin is looking into your downline to verify his claims. Regards...'}}},
								function(err, success){/////////////////////6
									if(err){
										console.log(err);
										return;
									}

									console.log({success2: success})

									if(success){
										res.send({msg: 'Purge success!'}); ///////////////finally, send the status to the client!
									}else{
										res.send({msg: 'No defaulter to purge!'}); ///////////////finally, send the status to the client!
									}

									
							});//////////////////////////////////////////////6
						});////////////////////////////////////////////////5
					});///////////////////////4

				}////////////////////3
			};///////////////////2

		});/////////////////////////1
	});////////////////////////0
}


//get_suspended_accounts
exports.get_purged_accounts_page = function(req, res, next){
	User.find({purged: true}, function(err, purged){

		var filters = [];

		if(purged != ''){

			if(err){
				console.log(err);
				return;
			}
			var outgoings, index, coupleId, requiredIncoming, approvalAmount, coupleIndex, uplineIndex, uplineId;
			

			purged.map(function(purge){
				outgoings = purge.outgoingReservations;

				for (var i = 0; i < outgoings.length; i++) {
					if(outgoings.length - i == 1){
						out = outgoings[i];
					}
				}

				var username = purge.username;
				var firstname = purge.firstname;
				var lastname = purge.lastname;
				var pop = out.pop;
				var image = out.imageName;
				var upline = out.upline;
				coupleId = out._id;

				User.findOne({username: upline}, function(err, up){
					var incomings = up.incomingReservations;
					uplineId = up._id;

					for(var i = 0; i < incomings.length; i++){
						if(incomings[i].coupleId == coupleId){
							requiredIncoming = incomings[i];
							uplineIndex = i;
							coupleIndex = incomings[i].coupleIndex;
							approvalAmount = incomings[i].amount;

						}
					}

					filters.push({username : username, firstname: firstname, lastname: lastname, upline: upline, pop: pop, image: image, coupleId: coupleId,
						approvalAmount: approvalAmount, coupleIndex: coupleIndex, uplineIndex: uplineIndex, uplineId: uplineId});

					res.render('azbycx/purgedAccts', {filters: filters});
					next();
				});
			});
		}else{
			res.render('azbycx/purgedAccts', {filters: filters});
			next();
		}
	});
}

//approve_purged_downline
exports.approve_purged_downline = function(req, res, next){
	const duname = req.body.duname;
	//const downlineId = req.body.downlineId;
	const approvalAmount = req.body.approvalAmount;
	const uplineId = req.body.uplineId;
	const coupleIndex= req.body.coupleIndex;
	const coupleId = req.body.coupleId;
	const image = req.body.image;
	const uplineUsername = req.body.uplineUsername;
	var date = new Date();
	var now = date.getTime();
	var suspensionTime = now + 48*3600*1000; //48hrs suspension
	//const uplineIndex = req.body.uplineIndex; //not useful since mongoose helps us find the index using the '$' notation.

		//db.blog.update({"comments.author" : "John"}, {"$set" : {"comments.$.author" : "Jim"}})

		//changes the upline action status to 'Approved'. so the 'Approve' and 'Decline' buttons vanishes on rendering
		//suspend the uplkine for wasting downline's time.

		User.findOne({username: duname}, function(err, down){
			if(err){
				console.log(err);
				return;
			}
			var downlineId = down._id;

			//suspend the upline for misbehaviour
			User.update({"incomingReservations.coupleId": coupleId},//imageName
				{$set: {"incomingReservations.$.confirmation_flag" :  "Approved", "incomingReservations.$.imageName" :  "Approved", "incomingReservations.$.pop" :  "Approved",
				suspended: true, suspensionTime: suspensionTime},
					$pull: {'inbox': {downlineId: downlineId}}},
				 function(err, updatedUpline){///**one******
					if(err){
						console.log(err);
						return;
					}

					if(!updatedUpline){
						console.log({msg: 'upline confirmation_flag state change failed!'});
						return;
					}

					User.findById(uplineId, function(err, upline){
						if(err){
							console.log(err);
							return;
						}

						if(upline.admin == true){

							User.update({"incomingReservations.coupleId": coupleId}, {$set: {suspended: false, suspensionTime: 0}}, function(err, suspensionRemoved){
								if(err){
									console.log(err);
									return;
								}

								//delete any message sent by upline
								Complaint.update({sender: uplineUsername}, {$pull: {sender: uplineUsername}}, function(err, result){
									if(err){
										console.log(err);
										return;
									}

									if(result){
										console.log({msg: 'Upline\'s message(s) deleted'});
									}else{
										console.log({msg: 'Upline probably didn\'t send a complain'});
									}

								});

								//delete any message sent by downline
								Complaint.update({sender: duname}, {$pull: {sender: duname}}, function(err, result){
									if(err){
										console.log(err);
										return;
									}

									if(result){
										console.log({msg: 'Downline\'s message(s) deleted'});
									}else{
										console.log({msg: 'Downline probably didn\'t send a complain'});
									}

								});
							});
						}
						
					});

					if(updatedUpline){//**************************************two***********************************************************
						//Delete the image.
						fs.unlink("C:\\Users\\luser\\Pictures\\MEPN\\api\\public\\uploads\\"+image, function(err){
							if(err){
								console.log(err);
								return;
							}
							
							console.log({msg: 'image :' + image + ' was successfully deleted!'});
						});

							//log the result of the update. I.e the status. 'updated' contains the execution stats such as these "{ ok: 0, n: 0, nModified: 0 }"
						console.log({msg: updatedUpline});


						User.update({_id: uplineId}, {$inc: {amountReceived: approvalAmount}}, function(err, reducedAmountRemaining){
							if(err){
								console.log(err);
								return;
							}

							if(!reducedAmountRemaining){
								console.log({msg: 'upline amountRemaining reduction failed!'});
								return;
							}
							
							if(reducedAmountRemaining){//******************************three*******************************************************

								console.log({msg: reducedAmountRemaining});

								User.update({"outgoingReservations._id": coupleId},
									{$set: {"outgoingReservations.$.confirmation_flag" :  "Approved", "outgoingReservations.$.imageName" :  "Approved", "outgoingReservations.$.pop" :  "Approved", purged: false},
									 $pull: {'inbox': {uplineId: uplineId}}}, 
									function(err, updatedDownline){///*************************four***********************************************************************
									if(err){
										console.log(err);
										return;
									}

									if(!updatedDownline){
										console.log({msg: 'downline confirmation_flag state change failed!'});
									}

									if(updatedDownline){//************************************five*************************************************************************
										console.log({msg: updatedDownline});
										//Reward dowline accordingly
										User.update({username: duname}, {$inc: {amountRemaining: approvalAmount*1.5, amountReserved: approvalAmount}}, function(err, amountUpdate){/////six********************

											if(err){
												console.log(err);
												return;
											}

											if(!amountUpdate){
												console.log({msg: 'downline amountRemaining increment failed!'});
												res.send({msg: 'Payment approval failed!'});
											}else{
												console.log({msg: amountUpdate});
												res.send({msg: 'Payment approve success'});
											}
								
										});//*************************************six*************************************************************************

									}//***************************************************five

									
								});////*******************************************four*********************************************************************



							}//******************************************three***********************************************************************
						});
						
					}//********************************************two************************************************************************
			});///****************************one**************************************************************************************
		});
	 
}

//decline_purged_downline
//The only reason for this function is to increment amount-remaining of upline upon confirmation by the superAdmin that the downline isn't serious
//as regards the payment he argued to have made or the downline is a blatant liar!
exports.decline_purged_downline = function(req, res, next){
	const duname = req.body.duname;
	const approvalAmount = req.body.approvalAmount;
	const uplineId = req.body.uplineId;
	const coupleIndex= req.body.coupleIndex;
	const coupleId = req.body.coupleId;
	const image = req.body.image;
	const uplineUsername = req.body.uplineUsername;

	User.findOne({username: duname}, function(err, down){
		if(err){
			console.log(err);
			return;
		}
		var downlineId = down._id;

			//decrement the decline status by '1'so as to prevent this document from being rendered the sencond time. This is bad if it happens
		User.update({_id: uplineId}, {$inc: {amountRemaining: approvalAmount}}, 
			function(err, updatedUpline){
				if(err){
					console.log(err);
					return;
				}

				User.update({"incomingReservations.coupleId": coupleId},
					{$set: {"incomingReservations.$.confirmation_flag" :  "Declined", "incomingReservations.$.imageName" :  "Declined", "incomingReservations.$.pop" :  "Declined"},
					 $pull: {'inbox': {downlineId: downlineId}}},
					function(err, updatedUpline){
						if(err){
							console.log(err);
							return;
						}

						//Delete the image.
						fs.unlink("C:\\Users\\luser\\Pictures\\MEPN\\api\\public\\uploads\\"+image, function(err){
							if(err){
								console.log(err);
								return;
							}
							
							console.log({msg: 'image :' + image + ' was successfully deleted!'});

							//delete any message sent by upline
							Complaint.update({sender: uplineUsername}, {$pull: {sender: uplineUsername}}, function(err, result){
								if(err){
									console.log(err);
									return;
								}

								if(result){
									console.log({msg: 'Upline\'s message(s) deleted'});
								}else{
									console.log({msg: 'Upline probably didn\'t send a complain'});
								}

							});

							//delete any message sent by downline
							Complaint.update({sender: duname}, {$pull: {sender: duname}}, function(err, result){
								if(err){
									console.log(err);
									return;
								}

								if(result){
									console.log({msg: 'Downline\'s message(s) deleted'});
								}else{
									console.log({msg: 'Downline probably didn\'t send a complain'});
								}

							});
						});

						var date = new Date();
						var now = date.getTime();
						var suspensionTime = now + 48*3600*1000; //48hrs suspension

						//suspend downline for wasting upline's time!
						User.update({"outgoingReservations._id": coupleId},
							{$set: {"purged": false, "suspended": true, "suspensionTime": suspensionTime, "outgoingReservations.$.confirmation_flag" :  "Declined",
									"outgoingReservations.$.imageName" :  "Declined", "outgoingReservations.$.pop" :  "Declined" },
							 $pull: {'inbox': {uplineId: uplineId}}},
							function(err, updatedUpline){
								if(err){
									console.log(err);
									return;
								}
							});
						
						console.log({updated: updatedUpline});
						res.send({msg: 'Payment Decline success!'});
					});
			});
	});
		
	
}