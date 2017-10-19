var express = require('express');
var port = process.env.PORT || 5000;
const morgan = require('morgan');
const path = require('path');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
const session = require('express-session');
const expressValidator = require('express-validator');
const flash = require('connect-flash');
const passport = require('passport');
const config = require('./config/database');

//INIT ES6 PROMISE
mongoose.Promise = global.Promise;

//CREATE DB CONN
//ALWAYS USE 'connection.openUri()' -- ALWAYS!!!!!!!!!!!!
mongoose.connection.openUri(config.db);

let db = mongoose.connection;

//check for db errors
db.on('error', (err) => {
	console.log(err);
});

db.once('open', ()=> {
	console.log('Connected to mongo db...');
});


//INIT APP
var app = express();

app.use(morgan('dev'));
//INIT BODY-PARSER
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

//INIT STATIC FOLDER
app.use(express.static(path.join(__dirname, 'public')));

/////////////////////////////////

//Express session middleware
app.use(session({
	secret: 'Keyboard cat',
	resave: true,
	saveUninitialized: true
	//cookie: { secure: true }
}));

//Express Messages Middleware
app.use(flash()); 				///INIT FLASH
app.use(function(req, res, next){
	res.locals.messages = require('express-messages')(req, res);
	next();
});

//Express validator Middleware
app.use(expressValidator({
	errorFormatter: function(param, msg, value){
		var namespace = param.split('.'),
			root = namespace.shift(),
		formParam = root;

		while(namespace.length){
			formParam += '[' + namespace.shift() + ']';
		}
		return {
			param: formParam,
			msg: msg,
			value: value
		};
		
	}
}));

//Passport config
require('./config/passport')(passport);
//passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.get('*', function(req, res, next){
	res.locals.user = req.user || null;
	next();
});


////////////////////////////////

//SET VIEW PATH AND ENGINE
app.set('views', path.join(__dirname, 'templates'));
app.set('view engine', 'pug');

////////////////////////////////
//HOME ROUTE
app.get('/', (req, res, next)=>{
	res.render('index');
	//res.send('hello');
});

///////////////////////////////////


const users = require('./api/models/userModel');
//IMPORT ROUTE FILE
var routes = require('./api/routes/routes');

//USE IMPORTED ROUTE
app.use('/users', routes);

/// catch 404 and forwarding to error handler
app.use(function(req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

/// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function(err, req, res, next) {
		res.status(err.status || 500);
		res.render('404', {
			message: err.message,
			error: err
		});
	});
}
// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
	res.status(err.status || 500);
	res.render('404', {
		message: err.message,
		error: {}
	});
});

//LISTEN 
app.listen(port, function(){
	console.log("Connection made on freaking port " + port);
});