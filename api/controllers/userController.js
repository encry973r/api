const mongoose = require('mongoose');
const passport = require('passport');
const User = mongoose.model('User');
const Complaint = require('../models/supportModel');
const Displaylist = require('../models/displayListModel');
const Testimony = require('../models/testimony');
const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
var fs = require('fs');
var csrf = require('csurf');
//var csrfProtection = csrf();

/////----------------------------------------------------PRODUCTION CONTROLLERS------------------------------------------------------------------------

//get request controller
exports.get_register_form = function(req, res, next){
	res.render('register', {csrfToken: req.csrfToken()});
	next();
};

//post to /users/register
exports.register_user = function(req, res, next){
	const username = req.body.username;
	const password = req.body.password;
	const password2 = req.body.password2;
	const secret = req.body.secret;

	req.checkBody('username', 'Username is required').notEmpty();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(password);
	req.checkBody('secret', 'Secret word is required').notEmpty();

	let errors = req.validationErrors();

	if(errors){
		res.render('register', {
			errors: errors
		});
	}else{
		var newUser = new User({
			username: username,
			password: password,
			secret: secret,
			admin: false,
			superAdmin: false
			});

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
						}
					});
				});
			});

		});

	}
};

//login get request controller
exports.get_login_form = function(req, res, next){
	res.render('login', {csrfToken: req.csrfToken()});  //{csrfToken: req.csrfToken()}
	next();
};


//ACTUAL USAGE OF PASSPORT MIDDLEWARE
exports.login_user = function(req, res, next){
	 //ACTUAL USAGE OF PASSPORT MIDDLEWARE
	 	passport.authenticate('local', {
		successRedirect: '/users/dashboard',
		failureRedirect: '/users/login',
		failureFlash: 'wrong username and password combination!'
		 })(req, res, next);
	 }

//Logout
exports.logout_user = function(req, res, next){
	req.logout();
	req.flash('success', 'You are logged out');
	res.redirect('/users/login');
};

//get_reset_passwd_page
exports.get_reset_passwd_page = function(req, res, next){
	res.render('passwordReset');
	next();
};

//post_to_reset_passwd
exports.post_to_reset_passwd = function(req, res, next){
	var username = req.body.username;
	var password = req.body.password;
	var password2 = req.body.password2;
	var secret = req.body.secret;

	req.checkBody('username', 'Username is required').notEmpty();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('secret', 'Secret pass is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(password);

	let errors = req.validationErrors();

	if(errors){
		res.render('passwordReset', {
			errors: errors
		});
	}else{

		User.findOne({username: username, secret: secret}, function(err, user){
			if(err){
				console.log(err);
				return;
			}

			if(!user){
				req.flash('danger', 'Sorry, username does not exist');
				res.redirect('/users/reset-passwd');
				next();
			}else{
				//encrypt new password
				bcrypt.genSalt(10, function(err, salt){
					if(err) console.log(err);

				  	bcrypt.hash(password, salt, function(err, hash){
						if(err){
							console.log(err);
						}

						password = hash;
						User.update({username: username, secret: secret}, {password: password}, function(err, updated){
							if(err){
								console.log(err);
								return;
							}else{
								req.flash('success', 'Password successfully changed you can now log in');
								res.redirect('/users/login');
							}
						});
					});
				});
			}
		});
		
	}

};

// get dashboard
exports.get_dashboard = function(req, res, next){
	//const amountRemaining = parseInt(req.user.amountRemaining);
	const amountReceived = parseInt(req.user.amountReceived);
	const amountReserved = parseInt(req.user.amountReserved);
	const amountRemaining = parseInt(amountReserved*1.5 - amountReceived);

	res.render('dashboard', {reserved: amountReserved, received: amountReceived, remainder: amountRemaining});
	next();
};

// get reservation list
exports.get_reservation_list = function(req, res, next){

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

		if(obj){///////////////////////////////////
			console.log(obj);
			var confirmation_flag;
			var date = new Date();
			var now = date.getTime();
			var incoming, outgoing;
			var suspended = req.user.suspended;

			var suspensionTime = req.user.suspensionTime;
			var timeLeft = suspensionTime - now;
			timeLeft = parseInt(timeLeft/(1000*3600));

			if(req.user.outgoingReservations != ''){
				for(var i = 0; i < req.user.outgoingReservations.length; i++){
					if(req.user.outgoingReservations.length - i == 1){
						outgoing = req.user.outgoingReservations[i];
						deadline = req.user.outgoingReservations[i].deadline;
						confirmation_flag = req.user.outgoingReservations[i].confirmation_flag;
					}
				}

				if(deadline == ''){ //new user
					deadline = 'empty';
				}else if(deadline > now && confirmation_flag == 'Pending'  && suspended == false){ //not yet expired
					deadline = 'Pending';
				}else if(deadline < now && confirmation_flag == 'Pending' && suspended == true){ // expired and suspended
					deadline = 'Suspended';
				}else if(deadline < now && confirmation_flag == 'Pending' && suspended == false){ //expired but not yet suspended
					deadline = 'expired';
				}else if(confirmation_flag == 'Approved'){
					deadline = 'Approved';
				}else if(confirmation_flag == 'Declined' ){
					deadline = 'Declined';
				}

				User.find({amountRemaining: {'$ne': 0, '$gt': 0}, suspended: false}, function(err, users){
					if(err){
						console.log(err);
						return;
					}else{
						res.render('reservation', {reserves: users, user: req.user, deadline: deadline, timeLeft: timeLeft, current_state: obj, outgoing: outgoing, incoming: incoming});
						next();
					}

				});
			}else{

				User.find({amountRemaining: {'$ne': 0, '$gt': 0}, suspended: false}, function(err, users){
					if(err){
						console.log(err);
						return;
					}else{
						res.render('reservation', {reserves: users, user: req.user, current_state: obj, empty: 'true', incoming: incoming});
						next();
					}

				});
			}
		}///////////////////////
	});
};


// get payment page
exports.get_payment_page = function(req, res, next){
	//check if the user has an outstanding payment to make.
	if(req.user.suspended == 'true'){
		res.redirect('/users/login');
		next();
	}else if(req.user.profileUpdated == 'true'){
		var outgoings = req.user.outgoingReservations;
		var index, out, coupleId, confirmation_flag, pop, uplineUsername, coupleIndex;
		var date = new Date();
		var now = date.getTime();

		for(var i = 0; i < outgoings.length; i++){
			if(outgoings.length - i == 1){
				index = i;
				out = outgoings[index];
				coupleId = out._id;
				confirmation_flag = out.confirmation_flag;
				uplineUsername = out.upline
				imageName = out.imageName;
				pop = out.pop
				
			}
		}

		if(confirmation_flag == 'Pending' && out.deadline > now ){ //there is an outstanding payment.
			User.findOne({username: uplineUsername}, function(err, upline){
				if(err){
					console.log(err);
					return;
				}

				uplineBankDetails = upline.bankDetails;
				res.render('payment', {uplineId: upline._id, realAmount: out.amount, uplineUsername: upline.username, user: req.user, uplineFirstname: upline.firstname,
				uplineLastname: upline.lastname, uplinePhone: upline.phone, uplineBankDetails: upline.bankDetails, image: imageName, coupleId: coupleId,
				amount: out.amount, pop: pop, reserved: 'navigation', csrfToken: req.csrfToken()});
			});
		}else{
			res.render('payment', {reserved: 'none'});
			next();
		}
	}else if (req.user.profileUpdated == 'false'){
		res.redirect('/users/profile');
		next();

	}
};

// get render payment page
exports.post_to_payment_page = function(req, res, next){

//check if the list has been suspended before redering the payment page--makes no sense since it would prevent the downline from completing his reservation

	var data = req.body.input;
	data = data.split('/');
	var uplineId= data[0];
	var realAmount = data[1];
	var uplineUsername = data[2];
	var uplineFirstname = data[3];
	var uplineLastname = data[4];
	var uplinePhone = data[5];
	var myProfileUpdated = data[7];
	var uplineBankDetails;
	//var uplineBankDetails = data[6]; refuses to be segmented in the payment template so i'll have to make a new request to get the bankDetails

	//var profileUpdated = req.user.profileUpdated;
	console.log(myProfileUpdated);

	if(myProfileUpdated == 'true'){

		User.findOne({_id: uplineId}, function(err, upline){
			if(err){
				console.log(err);
				return;
			}
			uplineBankDetails = upline.bankDetails;
			res.render('payment', {uplineId: uplineId, realAmount: realAmount, uplineUsername: uplineUsername, user: req.user, uplineFirstname: uplineFirstname,
			uplineLastname: uplineLastname, uplinePhone: uplinePhone, uplineBankDetails: uplineBankDetails, reserved: 'sent'});
			next();
		});
	}else{
		//req.flash('danger', 'You need to update your profile information');
		res.redirect('/users/profile');
		next();
	}
	
};//upload_pop

//upload_pop
exports.upload_pop = function(req, res, next){

		var data = req.body.data;
		data = data.split('/');

		var coupleId = data[0];
		var uplineId = data[1];
		var amount = data[2];
		var downline = req.user.username;
		const imageName = req.files[0].filename;
		

		User.findOneAndUpdate({username: downline, "outgoingReservations._id": coupleId}, {$set: {"outgoingReservations.$.imageName" : imageName,
				"outgoingReservations.$.pop" : 'yes'}}, function(err, uploaded){
			if(err){
				console.log(err);
				return;
			}

			//To hide the image source
			if(uploaded){

				User.findOneAndUpdate({_id: uplineId, "incomingReservations.coupleId": coupleId}, {$set: {"incomingReservations.$.imageName" : imageName,
						"incomingReservations.$.pop" : 'yes'}}, function(err, uploaded2){
					if(err){
						console.log(err);
						return;
					}

					if(uploaded2){
						req.flash('success', 'Image upload success!');
						res.redirect('/users/payment');	
					}

				});
			}else{
				req.flash('success', 'Sorry, your image could not be received at this time.');
				res.redirect('/users/payment');	
			}
			
		});
}

//get amount remaining
exports.get_current_ammountRemaining = function(req, res, next){
	var id = req.body.id;

	User.findById(id, function(err, user){
		if(err){
			console.log(err);
			return;
		}

		res.send({msg: user.amountRemaining});
	});
}

exports.submitreservation = function(req, res, next){

	var amountInput = req.body.amountInput;
	var uplineId = req.body.uplineId;
	var realAmount = req.body.realAmount;
	var currentRemainingAmount = 0;
	var status = 'Initial';
	var date = new Date();
	var now = date.getTime();
	var deadline = now + 120000;	//five mins of grace to pay up

	User.findById(uplineId, function(err, upline){

		if(err){
			console.log(err);
			return;
		}

		currentRemainingAmount = upline.amountRemaining;
		//************************************************************************************************************************************************

		if(amountInput > currentRemainingAmount && currentRemainingAmount >= 100){
			status = 'Amount has changed to ' + currentRemainingAmount;

		}else if(currentRemainingAmount == 0 || currentRemainingAmount < 100){
			status = 'Sorry, the user has completely been reserved. Kindly pick someone else. Thank you.';
		}else{

				//this holds an id for both transactions(to tie the outgoing of the downline to the the incoming of the upline)
		var coupleId = '';
		var coupleIndex = 0;

		User.findById(req.user._id, function(err, me){ /////////////////////level one****************************************************************************
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
													accountNumber: uplineAcctNumber},amount: amountInput, deadline: deadline});
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

					//increment the coupleIndex accordingly, to get the index of the rare object to be poped
					for(coupleIndex; coupleIndex < me.outgoingReservations.length; coupleIndex++){
						//Nothing goes in here.
					}

					var currentOutgoingData = me.outgoingReservations.pop();

					coupleId = currentOutgoingData._id;	//the outgoing transaction id of the downline
					coupleId = coupleId.toString();

					//Decrement amount remaining of upline
					User.update({_id: uplineId}, {$inc: {amountRemaining: -amountInput}}, function(err, updated){//***level four*****************
						if(err){
							console.log(err);
						}

						User.findById(uplineId).then(function(upline){//**************level five*********************************************

							//update incoming array of upline with downline info, coupled with couplId
							upline.incomingReservations.push({downline: myUsername, downlineFirstname: myFirstname, downlineLastname: myLastname,
															  phone: myPhone, amount: amountInput, deadline: deadline, coupleId: coupleId, coupleIndex: coupleIndex-1}); //error line

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
	});
};

// approve downline
exports.approve_downline = function(req, res, next){
	const duname = req.body.duname;
	const approvalAmount = req.body.approvalAmount;
	const uplineId = req.body.myId;
	const coupleIndex= req.body.coupleIndex;	
	const coupleId = req.body.coupleId;
	const imageName = req.body.imageName;
	
	//const uplineIndex = req.body.uplineIndex; //not useful since mongoose helps us find the index using the '$' notation.

		//db.blog.update({"comments.author" : "John"}, {"$set" : {"comments.$.author" : "Jim"}})

		//changes the upline action status to 'Approved'. so the 'Approve' and 'Decline' buttons vanishes on rendering
	User.update({"incomingReservations.coupleId": coupleId}, {$set: {"incomingReservations.$.confirmation_flag" :  "Approved", 
				 "incomingReservations.$.imageName" :  "Approved", "incomingReservations.$.pop" :  'Approved'}}, function(err, updatedUpline){///**one******
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

						//changes the downline status text to 'Approved'. so the 'Pending' text  vanishes on rendering
						User.update({"outgoingReservations._id": coupleId}, {$set: {"outgoingReservations.$.confirmation_flag" :  "Approved",
									 "outgoingReservations.$.imageName" :  "Approved", "outgoingReservations.$.pop" :  "Approved"}}, 
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

								//this deletes the image.
								fs.unlink("C:\\Users\\luser\\Pictures\\MEPN\\api\\public\\uploads\\"+imageName, function(err){
									if(err){
										console.log(err);
										return;
									}
									
									console.log({msg: 'image :' + imageName + ' was successfully deleted!'});
								});

								User.update({username: duname}, {$inc: {amountRemaining: approvalAmount*1.5, amountReserved: approvalAmount}}, function(err, amountUpdate){/////six********************

									if(err){
										console.log(err);
										return;
									}

									if(!amountUpdate){
										console.log({msg: 'downline amountRemaining increment failed!'});
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
	
};

// decline_downline
exports.decline_downline = function(req, res, next){
	const duname = req.body.duname;
	const approvalAmount = req.body.approvalAmount;
	const uplineId = req.body.myId;
	const coupleIndex= req.body.coupleIndex;
	const coupleId = req.body.coupleId;

			//change the upline action status to 'Approved'. so the 'Approve' and 'Decline' buttons vanishes on rendering
	User.update({"incomingReservations.coupleId": coupleId}, {$set: {"incomingReservations.$.confirmation_flag" :  "Declined"},
		 $inc: {transactionsDeclined: 1}},
		function(err, updatedUpline){
			if(err){
				console.log(err);
				return;
			}
			//log the result of the update. I.e the status. 'updated' contains the execution stats such as these "{ ok: 0, n: 0, nModified: 0 }"
			console.log({msg: updatedUpline});
			if(updatedUpline){

				//change the downline status to approved. so the 'Pending' text vanishes on rendering 
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
	
};


// get profile
exports.get_profile = function(req, res, next){
	res.render('profile', {bankDetails: req.user.bankDetails, profileUpdated: req.user.profileUpdated});
	next();
};

// update profile
exports.update_profile = function(req, res, next){
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
	res.redirect('/users/profile');
};

// get blog
exports.get_blog = function(req, res, next){
	res.render('blog');
	next();
};

// get support
exports.get_support = function(req, res, next){
	res.render('support');
	next();
};

// get support
exports.send_complaint = function(req, res, next){
	const sender = req.user.username;
	const subject = req.body.subject;
	const content = req.body.content;
	const senderEmail = req.user.email;

	var complaint = new Complaint({
					sender: sender,
					subject: subject,
					content: content
					});

	complaint.save(function(err, saved){
		if(err){
				console.log(err);
				return;
		}

		let transporter = nodemailer.createTransport({
			service: 'gmail',
			secure: false,
			port: 25,
			auth: {
				user: 'encry973r@gmail.com',
				pass: 'calculus20'
			},
			tls: {
				rejectUnauthorized: false
			}
		});

		let HelperOptions = {
			from: senderEmail,
			to: 'encry973r@gmail.com',
			subject: subject,
			text: content

		};

		transporter.sendMail(HelperOptions, (err, info) => {
			if(err){
				return console.log(err);
			}
			console.log('Message sent.');
			console.log(req.user.email);
			console.log(info);
			res.send({msg: 'message has been sent! Please do not resend this message so as to avoid spamming. Regards...'});
		})
	});
};

//get_inbox
exports.get_inbox = function(req, res, next){

		var outgoings = req.user.outgoingReservations;
		var incomings = req.user.incomingReservations;
		var out;

		for(var i = 0; i < outgoings.length; i++){
			if(outgoings.length - i == 1){
				out = outgoings[i]; // required outgoing!
			}
		}

		var inbox = req.user.inbox;
		res.render('inbox', {inbox: inbox, outgoing: out, incoming: incomings});
		next();
	

}


// get transaction
exports.get_transactions = function(req, res, next){

		var date = new Date();
		var now = date.getTime();

		var outgoings = req.user.outgoingReservations;
		var incomings = req.user.incomingReservations;
	
		for(var index = 0; index < outgoings.length; index++){
			outgoings[index].deadline = parseInt((outgoings[index].deadline - now)/60000);	//convert each deadline to minutes
		}

		for(var index = 0; index < incomings.length; index++){
			incomings[index].deadline = parseInt((incomings[index].deadline - now)/60000);	//convert each deadline to minutes
		}

		console.log(outgoings);
		console.log(incomings);

		
		res.render('transactions', {outgoing: outgoings, incoming: incomings});
		next();
};

//get_testimony_page
exports.get_testimony_page = function(req, res, next){
	res.render('testimony');
	next();
	
};

//submit_testimony
exports.submit_testimony = function(req, res, next){

	var testimony = new Testimony({
		testifier: req.user.username,
		testimony: req.body.testimony
	});

	testimony.save(function(err, sent){
		if(err){
			console.log(err);
			return;
		}
		if(sent){
			res.send({msg: 'Your testimony has been sent, the admin will endaevor to broadcast it in no time'});
		}else{
			res.send({msg: 'Your testimony can\'t not be sent at this time, please try again later. Thank you!'});
		}
	});

};

////--------------------------------------------------------END OF PRODUCTION CONTROLLERS--------------------------------------------------------
