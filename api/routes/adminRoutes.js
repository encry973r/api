const mongoose = require('mongoose');
const express = require('express');
const app = express();
const router = express.Router();
const adminController = require("../controllers/adminController");
const User = mongoose.model('User');
var csrf = require('csurf');
var csrfProtection = csrf();


function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	}else{
		req.flash('danger', 'Please login');
		res.redirect('/medusa123/login');
	}
}

function needsGroup(req, res, next){
	//return function(req, res, next){
		var username = req.body.username;
		//var password = req.body.password;

		User.findOne({username: username}, function(err, user){
			if(err){
				console.log(err);
				return;
			}

			if(user && user.admin == true){//if user
				//console.log(user);
				return next();
			}else if(user && user.admin == false){
				//res.send(401, 'Unauthorized');
				req.flash('danger', 'Please login');
				res.redirect('/users/login');
			}else if(!user){
				req.flash('danger', 'Wrong username and password combination');
				res.redirect('/users/login');
			}
		});
	//}
}


//display registeration form
	router.get('/register', csrfProtection, adminController.get_admin_register_form);

		//Register admin 
	router.post('/register', csrfProtection, adminController.register_admin);

		//display login form
	router.get('/login', csrfProtection, adminController.get_admin_login_form);

		//log in admin
	router.post('/login', csrfProtection, needsGroup, adminController.login_admin);

		//log out admin
	router.get('/logout', ensureAuthenticated, adminController.logout_admin);

		//load dashboard
	router.get('/dashboard', ensureAuthenticated, adminController.get_admin_dashboard);

		//load reservation list
	router.get('/reservation', ensureAuthenticated, adminController.get_admin_reservation_list);

	//load reservation list
	router.post('/publish', ensureAuthenticated, adminController.publish_list);

	//load reservation list
	router.post('/withdraw', ensureAuthenticated, adminController.withdraw_list);

	//approve downline
	router.post('/approvedownline', ensureAuthenticated, adminController.approve_admin_downline);

	//approve downline
	router.post('/approve-declined', ensureAuthenticated, adminController.approve_declined_downline);

	//approve downline
	router.post('/decline-declined', ensureAuthenticated, adminController.decline_declined_downline);

		//decline downline
	router.post('/declinedownline', ensureAuthenticated, adminController.decline_admin_downline);

	//approve-purged
	router.post('/approve-purged', ensureAuthenticated, adminController.approve_purged_downline);

	//decline downline
	router.post('/decline-purged', ensureAuthenticated, adminController.decline_purged_downline);

		//load profile
	router.get('/profile', ensureAuthenticated, adminController.get_admin_profile);

		//update profile
	router.post('/profile', ensureAuthenticated, adminController.update_admin_profile);

	//load transactions
	router.get('/transactions', ensureAuthenticated, adminController.get_admin_transactions);

	//get all registered users
	router.get('/users', ensureAuthenticated, adminController.get_all_registered_users);

	//get all registered admins
	router.get('/admins', ensureAuthenticated, adminController.get_all_registered_admins);
	//update-amount-remaining

	//get all registered admins
	router.post('/admins/update-amount-remaining', ensureAuthenticated, adminController.update_admin_amount_remaining);

	//get all registered admins
	router.get('/complaints', ensureAuthenticated, adminController.get_all_complaints);

	//get all declined transactions
	router.get('/declined-transactions', ensureAuthenticated, adminController.get_all_declined_transactions);

	//get all declined transactions
	router.get('/testimonies', ensureAuthenticated, adminController.get_all_testimonies);

	//get all declined transactions
	router.post('/reactivate-account', ensureAuthenticated, adminController.reactivate_account);

	//get all declined transactions
	router.get('/purge', ensureAuthenticated, adminController.get_purge_page); //get purge page so as to enable you purge defaulters
	
	//get all declined transactions
	router.post('/purge', /*ensureAuthenticated,*/ adminController.purge); // Purge deafulters

	//get all declined transactions
	router.get('/purged-accounts', /*ensureAuthenticated,*/ adminController.get_purged_accounts_page); // Purge deafulters

	module.exports = router;