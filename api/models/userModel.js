const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const date = new Date();

const day = date.getDate();
const hour = date.getHours();
const minutes = date.getMinutes();
const regDate = day + '/' + hour + '/' + minutes;


////////SUB-DOCUMENTS///////////////////////////////////////////
var BankDetails = new Schema({
		accountHolder: {
			type: String,
			//required: [true, "Enter AccountHolder name please"]
			default: 'Please update account name'
		},
		bankname: {
			type: String,
			//required: [true, "Enter bankname please"]
			default: 'Please update bank name'
		},
		accountNumber: {
			type: String,
			//required: [true, "Enter accountNumber please"]
			default: 'Please update account number'
		}
});

var OutgoingReservations = new Schema({
	upline: String,
	uplineFirstname: String,
	uplineLastname: String,
	phone: String,
	bank: [BankDetails],
	amount: Number,
	deadLine: Date,
	confirmation_flag: {
		type: String,
		default: 'Pending'
	}
});

var IncomingReservations = new Schema({
	downline: String,
	downlineFirstname: String,
	downlineLastname: String,
	phone: String,
	amount: Number,
	deadLine: Date,
	confirmation_flag: {
		type: String,
		default: 'Pending'
	},
	coupleIndex: Number, //this is equivalent to the index mongo creates in the outgoing transaction of the downline.
	coupleId: String	//this is equivalent to the id mongo creates in the outgoing transaction of the downline. I only copied it on here
	//it binds this incoming transaction(of this upline) to its corresponding outgoing transaction of downline.

});
////////////////////////////////////END OF SUB-DOCUMENTS

var UserSchema = new Schema({

	firstname: {							//Your Firstname
		type: String,
		///required: [true, "Enter Firstname please"]
		default: 'Please update your name'
	},

	lastname: {								//Your Lastname
		type: String
		//required: [true, "Enter lastname please"]
	},

	phone: {								//Telephone Number
		type: String,
		//required: [true, "Enter phone number please"]
		default: 'Please update your phone number'
	},

	email: {								//Email detail
		type: String,
		//required: [true, "Enter email please"]
		default: 'Please update your email'
	},

	bankDetails: [BankDetails],

	username: {								//Your username
		type: String,
		required: [true, "Enter username please"]
	},

	password: {								//Your password
		type: String,
		required: [true, "Enter password please"]
	},

	profileUpdated: {
		type: String,
		default: false
	},

	outgoingReservations: [OutgoingReservations],				//Outgoing Reservation

	incomingReservations: [IncomingReservations],				//Incoming reservations

	amountRemaining: {
		type: Number,
		default: 0.0
	},
	amountReceived: {
		type: Number,
		default: 0
	},

	cycle: {								//Number of cycles
	 	type: Number,
	 	default: 0
	 },

	 admin: {								//User previlege ('1' for admin(s), '0' for normal user(s))
	 	type: Number,
	 	default: 0
	 }
});

var User = mongoose.model('User', UserSchema);

module.exports = User;