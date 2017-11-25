//'use strict';

const express = require('express');
//const app = express();
const router = express.Router();
const userController = require("../controllers/userController");
const mongoose = require('mongoose');
const passport = require('passport');
const User = mongoose.model('User');
var csrf = require('csurf');
var csrfProtection = csrf();

//router.use(csrfProtection);

//file upload
const multer = require('multer');
const storage = multer.diskStorage({
	destination: function(req, file, cb){
		cb(null, 'public/uploads/');
	},
	filename: function(req, file, cb){
		cb(null, Date.now() + file.originalname);

	}
});
var upload = multer({storage: storage});


function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}else{
		req.flash('danger', 'Please login');
		res.redirect('/users/login');
	}
}

function needsGroup(req, res, next){
		var username = req.body.username;

		User.findOne({username: username}, function(err, user){
			if(err){
				console.log(err);
				return;
			}

			if(user && user.admin == false){//if user
				//console.log(user);
				return next();
			}else if(user && user.admin == true){
				//res.send(401, 'Unauthorized');
				req.flash('danger', 'Please login');
				res.redirect('/medusa123/login');
			}else if(!user){
				req.flash('danger', 'Wrong username and password combination');
				res.redirect('/users/login');
			}
		});
}

/*//checkSecretWord
function checkSecretWord(req, res, next){
	var secret = req.body.secret;

	if(secret == ''){
		req.flash('danger', 'Secret word annot be empty');
		res.redirect('/users/register');
	}else{
		next();
	}
}*/

function checkSuspended(req, res, next){
	var username = req.body.username;

	User.findOne({username: username}, function(err, user){ //make sure you use findOne if it is one decument you want!!!!!!!!!!! (lesson life)
		var date = new Date();
		var now = date.getTime();

		if(user.suspended == true){
			var suspensionTime = user.suspensionTime;

				//check if suspension time has elapsed
			if(suspensionTime > now){

				var suspensionTime = user.suspensionTime;
				var timeLeft = suspensionTime - now;
				timeLeft = parseInt(timeLeft/(1000*3600));
				//if not
				req.flash('danger', 'Your account has been suspend. Would be reactivated in '+ timeLeft + ' hrs time');
				res.redirect('login');
			}else{

				User.update({username: username}, {$set: {suspended: false, suspensionTime: 0}}, function(err, active){
					if(err){
						console.log(err);
						return;
					}
					
					next();
				});
			}

		}else{
			//if suspension time 
			next();// not suspended
		}
		
	});
}

		//display registeration form
	router.get('/register', csrfProtection, userController.get_register_form);

		//Register user 
	router.post('/register', csrfProtection, userController.register_user);

		//display login form
	router.get('/login', csrfProtection, userController.get_login_form);

		//log in user
	router.post('/login', csrfProtection, needsGroup, checkSuspended, userController.login_user);

		//log out user
	router.get('/logout', ensureAuthenticated, userController.logout_user);//

		//reset-passwd
	router.get('/reset-passwd', userController.get_reset_passwd_page);
		
		//reset-passwd
	router.post('/reset-passwd', userController.post_to_reset_passwd);

		//load dashboard
	router.get('/dashboard', ensureAuthenticated, userController.get_dashboard);

		//load reservation list
	router.get('/reservation', ensureAuthenticated, userController.get_reservation_list);

	//load reservation list
	router.get('/payment', ensureAuthenticated, userController.get_payment_page);//
	
	//load reservation list
	router.post('/payment', ensureAuthenticated, userController.post_to_payment_page);//get_payment_page

		//update profile
	router.post('/payment/upload', ensureAuthenticated, upload.single(), userController.upload_pop);

	//load reservation list
	router.post('/payment/amountRemaining', ensureAuthenticated, userController.get_current_ammountRemaining);

		//submit reservation request
	router.post('/submitreservation', ensureAuthenticated, userController.submitreservation);

		//approve downline
	router.post('/approvedownline', ensureAuthenticated, userController.approve_downline); //

		//decline downline
	router.post('/declinedownline', ensureAuthenticated, userController.decline_downline); //declinedownline

		//load profile
	router.get('/profile', ensureAuthenticated, userController.get_profile);//profile/upload/image

		//update profile
	router.post('/profile', ensureAuthenticated, userController.update_profile);

		//load support
	router.get('/support', ensureAuthenticated, userController.get_support);

	//load support
	router.post('/support', ensureAuthenticated, userController.send_complaint);

		//load blog
	router.get('/blog', ensureAuthenticated, userController.get_blog);

		//load transactions
	router.get('/transactions', ensureAuthenticated, userController.get_transactions);

		//load inbox
	router.get('/inbox', ensureAuthenticated, userController.get_inbox);
/*		//load transactions
	router.get('/testimony', ensureAuthenticated, userController.get_testimony_page);
	
	//load transactions
	router.post('/testimony', ensureAuthenticated, userController.submit_testimony);
*/
	/*//load transactions
	router.get('/testimonies-to-home', ensureAuthenticated, userController.submit_testimonies_to_home);
*/
	module.exports = router;