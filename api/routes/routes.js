//'use strict';

const express = require('express');
const app = express();
const router = express.Router();
const userController = require("../controllers/userController");

		//return array of users
	//router.get('/', userController.list_all_registered_users);

		//display registeration form
	router.get('/register', userController.get_register_form);

		//Register user 
	router.post('/register', userController.register_user);

		//display login form
	router.get('/login', userController.get_login_form);

		//log in user
	router.post('/login', userController.login_user);

		//log out user
	router.get('/logout', userController.logout_user);

		//load dashboard
	router.get('/dashboard', userController.get_dashboard);

		//load reservation list
	router.get('/reservation', userController.get_reservation_list);

		//get reservation data give id
	router.get('/getreservationdata/:id', userController.get_getReservationData);

		//submit reservation request
	router.post('/submitreservation', userController.submitreservation);

		//approve downline
	router.post('/approvedownline', userController.approve_downline); //

		//decline downline
	router.post('/declinedownline', userController.decline_downline); //declinedownline

		//load profile
	router.get('/profile', userController.get_profile);

		//update profile
	router.post('/profile', userController.update_profile);

		//load support
	router.get('/support', userController.get_support);

		//load blog
	router.get('/blog', userController.get_blog);

		//load transactions
	router.get('/transactions', userController.get_transactions);

		/*/updates the bank record of current user
	router.post('/updateBankDetails/:id', userController.update_bank_record);

		//return user downline(s)
	router.get('/incoming/:id', userController.get_data_of_downlines);

		//return user upline(s)
	router.get('/outgoing/:id', userController.get_data_of_uplines);*/

	/*router.use(function(req, res, next){
		res.status(404);
		res.render('404.pug');
		next();
	});*/

		module.exports = router;