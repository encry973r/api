const mongoose = require('mongoose');
const passport = require('passport');
const User = mongoose.model('User');
const bcrypt = require('bcryptjs');


/////----------------------------------------------------PRODUCTION CONTROLLERS------------------------------------------------------------------------

//get_home request controller
exports.get_home = function(req, res, next){
	res.render('home');
	next();
};


//get request controller
exports.get_register_form = function(req, res, next){
	res.render('register');
	next();
};

//post to /users/register
exports.register_user = function(req, res, next){
	/*const firstname = req.body.firstname;
	const lastname = req.body.lastname;*/
	const username = req.body.username;
	const password = req.body.password;
	const password2 = req.body.password2;

	/*req.checkBody('firstname', 'Firstname is required').notEmpty();
	req.checkBody('lastname', 'Email is required').notEmpty();*/
	req.checkBody('username', 'Username is required').notEmpty();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(password);


	let errors = req.validationErrors();

	if(errors){
		res.render('register', {
			errors: errors
		});
	}else{
		var newUser = new User({
			/*Firstname: firstname,
			Lastname: lastname,*/
			username: username,
			password: password
	});

		/*var newUser = new User(req.body);

		newUser.save(function(err, user){
			if(err) console.log(err);
			res.send('Registered');
		});*/

		User.findOne({username: newUser.username}, function(err, user){
			if(err) throw err;
			if(user){
				req.flash('info', 'Username already taken. Please try another');
				res.render('register', {user: newUser});
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
							res.redirect('/users/login');
							next();
						}
					});
				});
		});

		});

	}
};

//login get request controller
exports.get_login_form = function(req, res, next){
	res.render('login');
	next();
};

//ACTUAL USAGE OF PASSPORT MIDDLEWARE
exports.login_user = function(req, res, next){
	passport.authenticate('local', {
	successRedirect: '/users/dashboard',
	failureRedirect: '/users/login',
	failureFlash: 'wrong username and password combination'
	 })(req, res, next);
};

//Logout
exports.logout_user = function(req, res, next){
	ensureAuthenticated(req, res, next);
	req.logout();
	req.flash('success', 'You are logged out');
	res.redirect('/users/login');
};

// get dashboard
exports.get_dashboard = function(req, res, next){
	//ensureAuthenticated(req, res, next);
	const amountRemaining = req.user.amountRemaining;
	const amountReceived = req.user.amountReceived;

	const input = (amountRemaining + amountReceived)/1.5;

	res.render('dashboard', {input: input, received: amountReceived, remainder: amountRemaining});
	next();
};

// get reservation list
exports.get_reservation_list = function(req, res, next){
	//ensureAuthenticated(req, res, next);
	User.find({amountRemaining: {'$ne': 0, '$gt': 0}}, function(err, users){
		res.render('reservation', {reserves: users, user: req.user});
		next();
	});
};

// get reservation data
exports.get_getReservationData = function(req, res, next){
	//ensureAuthenticated(req, res, next);
	User.find({_id: req.params.id}, function(err, user){
		if(err) console.log(err);
		return res.send(user);
		//next();
	});
};

// get reservation data
exports.submitreservation = function(req, res, next){

	//ensureAuthenticated(req, res, next);
	
	var amountInput = req.body.amountInput;
	var uplineId = req.body.uplineId;
	var myId = req.body.myId;
	var realAmount = req.body.realAmount;
	var currentRemainingAmount = 0;
	var status = 'Initial';

	User.findById(uplineId, function(err, upline){

		if(err){
			console.log(err);
			return;
		}

		currentRemainingAmount = upline.amountRemaining;
		//************************************************************************************************************************************************

		if(amountInput > currentRemainingAmount && currentRemainingAmount >= 20000){
			status = 'Amount has changed to ' + currentRemainingAmount;

		}else if(currentRemainingAmount == 0){
			status = 'Sorry, the user has completely been reserved. Kindly pick someone else. Thank you.';
		}else{

				//this holds an id for both transactions(to tie the outgoing of the downline to the the incoming of the upline)
		var coupleId = '';
		var coupleIndex = 0;

		User.findById(myId, function(err, me){ /////////////////////level one****************************************************************************
			if(err){
					console.log(err);
					return;
			}

			var myUsername = me.username;
			var myFirstname = me.firstname;
			var myLastname = me.lastname;
			var myPhone = me.phone;
				
			User.findById(uplineId, function(err, up){////////////////level two************************************************************
				if(err){
					console.log(err);
					return;
				}

				const uplineUname = up.username;
				const uplineFirstname = up.firstname;
				const uplineLastname = up.lastname
				const uplinePhone = up.phone;
				const uplineAcctName = up.bankDetails[0].accountHolder;
				const uplineBankname = up.bankDetails[0].bankname;
				const uplineAcctNumber = up.bankDetails[0].accountNumber;

					//update outgoing reservations array of downline with upline info
				me.outgoingReservations.push({upline: uplineUname, uplineFirstname: uplineFirstname, uplineLastname: uplineLastname, 
													phone: uplinePhone, bank: {bankname: uplineBankname, accountHolder: uplineAcctName, 
													accountNumber: uplineAcctNumber},amount: amountInput});
						//persist the above
				me.save(function(err, saved){//***********level three****************************************************************
					if(err){
						console.log(err);
						return;
					}
					//first copy of outgoing data for manipulation
					var outgoingReservationsArray = me.outgoingReservations;

					//second copy  of outgoing data for manipulation
					var outgoingReservationsArrayCopy = me.outgoingReservations;

					//increment the coupleIndex accordingly to get the index of the rare object to be poped
					for(coupleIndex; coupleIndex < me.outgoingReservations.length; coupleIndex++){
						//Nothing goes in here.
					}

					var currentOutgoingData = me.outgoingReservations.pop();

					coupleId = currentOutgoingData._id;	//the outgoing transaction id of the downline
					coupleId = coupleId.toString();

					//update amount remaining of upline
					User.update({_id: uplineId}, {$inc: {amountRemaining: -amountInput}}, function(err, updated){//***level four*****************
						if(err){
							console.log(err);
						}

						User.findById(uplineId).then(function(upline){//**************level five*********************************************

							//update incoming array of upline with downline info, coupled with couplId
							upline.incomingReservations.push({downline: myUsername, downlineFirstname: myFirstname, downlineLastname: myLastname,
															  phone: myPhone, amount: amountInput, coupleId: coupleId, coupleIndex: coupleIndex-1}); //error line

							//persist the above
							upline.save().then(function(err, saved){
								if(err){
									console.log(err);
									return;
								}
							});

						});//********************************************level five****************************************

					});//*********************************level four*******************************************************

				
				});//************************************level three*******************************************************************
			});//***************************************level two*******************************************************************
		});////////////////////////////////level one****************************************************************************
		status = "Reservation made!";
	}

		//************************************************************************************************************************************************
		return res.send({status: status, currentRemainingAmount: currentRemainingAmount});
		next();
	});
};

// approve downline
exports.approve_downline = function(req, res, next){
	//ensureAuthenticated(req, res, next);
	const duname = req.body.duname;
	const approvalAmount = req.body.approvalAmount;
	const uplineId = req.body.myId;
	const coupleIndex= req.body.coupleIndex;	
	const coupleId = req.body.coupleId;
	//const uplineIndex = req.body.uplineIndex; //not useful since mongoose helps us find the index using the '$' notation.

		//db.blog.update({"comments.author" : "John"}, {"$set" : {"comments.$.author" : "Jim"}})

		//changes the upline action status to 'Approved'. so the 'Approve' and 'Decline' buttons vanishes on rendering
	User.update({"incomingReservations.coupleId": coupleId}, {$set: {"incomingReservations.$.confirmation_flag" :  "Approved"}}, function(err, updatedUpline){///**one******
			if(err){
				console.log(err);
				return;
			}

			if(!updatedUpline){
				console.log({msg: 'upline confirmation_flag state change failed!'});
			}
			
			if(updatedUpline){//**************************************two***********************************************************

					//log the result of the update. I.e the status. 'updated' contains the execution stats such as these "{ ok: 0, n: 0, nModified: 0 }"
				console.log({msg: updatedUpline});

				User.update({_id: uplineId}, {$inc: {amountReceived: approvalAmount}}, function(err, reducedAmountRemaining){
					if(err){
						console.log(err);
						return;
					}

					if(!reducedAmountRemaining){
						console.log({msg: 'upline amountRemaining reduction failed!'});
					}
					
					if(reducedAmountRemaining){//******************************three*******************************************************

						console.log({msg: reducedAmountRemaining});

						User.update({"outgoingReservations._id": coupleId}, {$set: {"outgoingReservations.$.confirmation_flag" :  "Approved"}}, 
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

								User.update({username: duname}, {$inc: {amountRemaining: approvalAmount*1.5}}, function(err, amountUpdate){/////six********************

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
};

// decline_downline
exports.decline_downline = function(req, res, next){
	//ensureAuthenticated(req, res, next);
	const duname = req.body.duname;
	const approvalAmount = req.body.approvalAmount;
	const uplineId = req.body.myId;
	const coupleIndex= req.body.coupleIndex;
	const coupleId = req.body.coupleId;

			//changes the upline action status to 'Approved'. so the 'Approve' and 'Decline' buttons vanishes on rendering
	User.update({"incomingReservations.coupleId": coupleId}, {$set: {"incomingReservations.$.confirmation_flag" :  "Declined"}}, function(err, updatedUpline){
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
					/*User.update({username: duname}, {$inc: {amountRemaining: approvalAmount*1.5}}, function(err, amountUpdate){/////////

						if(err){
							console.log(err);
							return;
						}

						if(amountUpdate){
							console.log({msg: amountUpdate});
						}
						
					});////////////////////////////////////////////////////////////////////////////////////////////////////////////////*/
				});////one
			}
		});
	return res.send({msg: 'Payment Decline success!'});
	
};


// get profile
exports.get_profile = function(req, res, next){
	//ensureAuthenticated(req, res, next);

	res.render('profile', {bankDetails: req.user.bankDetails, profileUpdated: req.user.profileUpdated});
	next();
};

// update profile
exports.update_profile = function(req, res, next){
	//ensureAuthenticated(req, res, next);
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

		User.update({_id: id}, {$set: { bankDetails: {
										accountHolder: accountHolder, bankname: bankname, accountNumber: acctNumber}}})
			.then(function(err, updated){
				if(err){
					console.log(err);
					return;
				}
			});
	}

	req.flash('success', 'Profile Updated...');
	res.redirect('/users/profile');
	next();
};

// get blog
exports.get_blog = function(req, res, next){
	//ensureAuthenticated(req, res, next);
	res.render('blog');
	next();
};

// get support
exports.get_support = function(req, res, next){
	//ensureAuthenticated(req, res, next);
	res.render('support');
	next();
};

// get transaction
exports.get_transactions = function(req, res, next){
	//ensureAuthenticated(req, res, next);
	var userid = req.user._id;

	User.findById(userid, function(err, user){
		if(err){
			console.log(err);
		}
		
		res.render('transactions', {outgoing: user.outgoingReservations, incoming: user.incomingReservations});
		next();
	});
};

//validation check
exports.check_if_user_exists = function(username){
	User.findOne({username: username}, function(err, user){	//check for the availability of the input username
		if(err)	throw err;
																	//If error occurs, log it to the console
		if(user === null){
			return null;													//if username does not exist, return 'empty';
		}else{
			return user
		}

});
};


exports.update_bank_record = function(req, res, next){

	var AH = req.body.AccountHolder;
	var BN = req.body.Bankname;
	var AN = req.body.AccountNumber;

		User.findOneAndUpdate({_id: req.params.id}, {BankDetails : {
			AccountHolder: AH,
			Bankname: BN,
			AccountNumber: AN
		}}, function(err){
				if(err){
					res.send(err);
				}else{
					res.json({save : "success"});
					return next();
				}
			});
};

exports.get_data_of_downlines = function(req, res, next){
	ensureAuthenticated(req, res, next);
	
	User.findOne({_id: req.params.id}, function(err, users){
		if(err){
			console.log(err);
			res.send(err);
		}

		res.json(users.IncomingReservations);
		return next();
	});
};

exports.get_data_of_uplines = function(req, res, next){
	ensureAuthenticated(req, res, next);
	User.findOne({_id: req.params.id}, function(err, users){
		if(err){
			console.log(err);
			res.send(err);
		}

		res.json(users.OutgoingReservations);
		return next();
	});
};


function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}else{
		req.flash('danger', 'Please login');
		res.redirect('/users/login');
	}
}

////---------------------------------------------------------END OF PRODUCTION CONTROLLERS--------------------------------------------------------


//for testing and debugging
exports.list_all_registered_users = function(req, res, next){
	User.find({}).then(function(err, users){
		if(err){
			console.log(err);
			return;						//else return user object for manipulation
		}

		if(users == null){													//if username does not exist, return 'empty'
			console.log({usernameLookup: "empty"});
		}else{
			res.json({usernameLookup : [users]});
			return next();						//else return user object for manipulation
		}
	});
};