var express = require('express');
var router = express.Router();
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var User = require('../models/user');

// Register
router.get('/register', checkIfAuth, function(req, res){
	res.render('register');
});

// Login
router.get('/login', checkIfAuth, function(req, res){
	res.render('login');
});

// Register User
router.post('/register', function(req, res){
	var login = req.body.login;
	var email = req.body.email;
	var name = req.body.name;
	var surname = req.body.surname;
	var password = req.body.password;
	var password2 = req.body.password2;
	var w_usd = req.body.usd || 0;
	var w_eur = req.body.eur || 0;
	var w_chf = req.body.chf || 0;
	var w_rub = req.body.rub || 0;
	var w_czk = req.body.czk || 0;
	var w_gbp = req.body.gbp || 0;
	var w_pln = req.body.pln || 1500;

	// Validation
	req.checkBody('login', 'Login is required').notEmpty();
	req.checkBody('login', 'Login is already taken').isLoginAvailable();
	req.checkBody('email', 'Email is required').notEmpty();
	req.checkBody('email', 'Email is not valid').isEmail();
	req.checkBody('name', 'Name is required').notEmpty();
	req.checkBody('surname', 'Surename is required').notEmpty();
	req.checkBody('password', 'Password is required').notEmpty();
	req.checkBody('password2', 'Passwords do not match').equals(req.body.password);


	var errors = req.validationErrors();

	if(errors){
		res.render('register',{
			errors:errors
		});
	} else {
		var newUser = new User({
			login: login,
			email: email,
			name: name,
			surname: surname,
			password: password,
			wallet: { 
				usd: w_usd,
				eur: w_eur,
				chf: w_chf,
				rub: w_rub,
				czk: w_czk,
				gbp: w_gbp,
				pln: w_pln,
			}

		});

		User.createUser(newUser, function(err, user){
			if(err) throw err;
		});

		req.flash('success_msg', 'You registered successful');

		res.redirect('/users/login');
	}
});

//IMPORTANT: usernameField default is 'username'
passport.use(new LocalStrategy({
    usernameField: 'login'
  },
  function(login, password, done) {
   User.getUserByLogin(login, function(err, user){
   	if(err) throw err;
   	if(!user){
   		return done(null, false, {message: 'Unknown User'});
   	}

   	User.comparePassword(password, user.password, function(err, isMatch){
   		if(err) throw err;
   		if(isMatch){
   			return done(null, user);
   		} else {
   			return done(null, false, {message: 'Invalid password'});
   		}
   	});
   });
  }));


// Edit User
router.post('/edit', function(req, res){
	var email = req.body.email;
	var name = req.body.name;
	var surname = req.body.surname;
	var password = req.body.password;
	var password2 = req.body.password2;
	var w_usd = req.body.usd || req.user.wallet.usd;
	var w_eur = req.body.eur || req.user.wallet.eur;
	var w_chf = req.body.chf || req.user.wallet.chf;
	var w_rub = req.body.rub || req.user.wallet.rub;
	var w_czk = req.body.czk || req.user.wallet.czk;
	var w_gbp = req.body.gbp || req.user.wallet.gbp;
	var w_pln = req.body.pln || req.user.wallet.pln;

	// Validation
	req.checkBody('email', 'Email is not valid').isEmail();
	req.checkBody('password2', 'Passwords do not match').equals(req.body.password);

	var errors = req.validationErrors();

	if(errors){
		req.flash('error_msg', errors[0].msg);
		res.redirect('/');
	} else {
		if(password){
			var editUser = {
				email: email,
				name: name,
				surname: surname,
				password: password,
				wallet: {
					usd: w_usd,
					eur: w_eur,
					chf: w_chf,
					rub: w_rub,
					czk: w_czk,
					gbp: w_gbp,
					pln: w_pln,
				}
			};
		} else {
			var editUser = {
				email: email,
				name: name,
				surname: surname,
				wallet: {
					usd: w_usd,
					eur: w_eur,
					chf: w_chf,
					rub: w_rub,
					czk: w_czk,
					gbp: w_gbp,
					pln: w_pln,
				}
			};
		}



		User.editUser(req.user.id, editUser, function(err, user){
			if(err) throw err;
		});

		req.flash('success_msg', 'Successful');

		res.redirect('/');
	}
});

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.getUserById(id, function(err, user) {
    done(err, user);
  });
});

// Login process
router.post('/login',
  passport.authenticate('local', {successRedirect:'/', failureRedirect:'/users/login',failureFlash: true}),
  function(req, res) {
    res.redirect('/');

  });

// Logout
router.get('/logout', function(req, res){
	req.logout();

	req.flash('success_msg', 'You are logged out');

	res.redirect('/users/login');
});

function checkIfAuth(req, res, next){
	if(req.isAuthenticated()){
		res.redirect('/');
	} else {
		return next();
	}
}

module.exports = router;

