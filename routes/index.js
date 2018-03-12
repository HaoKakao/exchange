var express = require('express');
var router = express.Router();
var User = require('../models/user');

// Get Index Page
router.get('/', ensureAuthenticated, function(req, res){

	var dataWallet = mathValueWallet(res.locals.curr_data.Items, req.user.wallet);
	res.render('index',{
    	dataWallet: dataWallet
  	});
});

// Post Buy Currency
router.post('/buy', function(req, res){
	var updateWallet = [];
	var currency = req.body.currency;
	var currencyQuantity = req.body.currencyquantity;
	var currencySellPrice = req.body.sellprice;
	var currencyUnit = req.body.unit;
	var dbCurrency = res.locals.curr_data.Items.find( data => data.Code === currency.toUpperCase()); 

	// Validation
	req.checkBody('currencyquantity', 'Quantity not found!').notEmpty();
	req.checkBody('sellprice', 'Currency was changed, try again').equals(dbCurrency.SellPrice);

	var errors = req.validationErrors();
	if(errors){
		req.flash('error_msg', errors[0].msg);
		res.redirect('/');
	} else {

		// Calc Amount for buy
		var getPlnAmount = (currencyQuantity*currencySellPrice)/currencyUnit;
		getPlnAmount = parseFloat(getPlnAmount);

		// Validation for true values
		if(req.user.wallet.pln < getPlnAmount){
			req.flash('error_msg', 'You do not have enough PLN!');
			res.redirect('/');
		} else{

			getPlnAmount = req.user.wallet.pln-getPlnAmount;
			var getCurrencyValue = req.user.wallet[currency]+parseFloat(currencyQuantity);

			updateWallet['currency'] = currency;
			updateWallet['amount'] = getCurrencyValue.toFixed(2);
			updateWallet['plnamount'] = getPlnAmount.toFixed(2);

			User.getUpdateWallet(req.user.id, updateWallet,  function(err, user){
				if(err) throw err;
			});
			req.flash('success_msg', 'The purchase was successful');

			res.redirect('/');
		}
	}
});

// Post Sell Currency
router.post('/sell', function(req, res){
	var updateWallet = [];
	var currency = req.body.currency;
	var currencyQuantity = req.body.currencyquantity;
	var currencyPurchasePrice = req.body.purchaseprice;
	var currencyUnit = req.body.unit;
	var dbCurrency = res.locals.curr_data.Items.find( data => data.Code === currency.toUpperCase()); 

	// Validation
	req.checkBody('currencyquantity', 'Quantity not found!').notEmpty();
	req.checkBody('purchaseprice', 'Currency was changed, try again').equals(dbCurrency.PurchasePrice);

	var errors = req.validationErrors();
	if(errors){
		req.flash('error_msg', errors[0].msg);
		res.redirect('/');
	} else {

		// Calc Amount for sell
		var getPlnAmount = (currencyQuantity*currencyPurchasePrice)/currencyUnit;
		getPlnAmount = parseFloat(getPlnAmount);

		// Validation for true values
		if(currencyQuantity > req.user.wallet[currency]){
			req.flash('error_msg', 'You do not have enough quantity!');
			res.redirect('/');
		} else {
			getPlnAmount = req.user.wallet.pln+getPlnAmount;
			var getCurrencyValue = req.user.wallet[currency]-parseFloat(currencyQuantity);

			updateWallet['currency'] = currency;
			updateWallet['amount'] = getCurrencyValue.toFixed(2);
			updateWallet['plnamount'] = getPlnAmount.toFixed(2);

			User.getUpdateWallet(req.user.id, updateWallet,  function(err, user){
				if(err) throw err;
			});
			req.flash('success_msg', 'The sale was successful');

			res.redirect('/');
		}
	}
});

function ensureAuthenticated(req, res, next){
	if(req.isAuthenticated()){
		return next();
	} else {
		res.redirect('/users/login');
	}
}

function mathValueWallet(currencies, wallet){
	var data = {};
	for(var i = 0; i < currencies.length;i++){
   		var value = (currencies[i].PurchasePrice*wallet[currencies[i].Code.toLowerCase()])/currencies[i].Unit;
   		data[currencies[i].Code] = {Code: currencies[i].Code, Value: value.toFixed(2), PurchasePrice: currencies[i].PurchasePrice, Amount: wallet[currencies[i].Code.toLowerCase()] | 0, Unit: currencies[i].Unit};	 
  	}
  return data;
}

module.exports = router;


