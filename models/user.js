var mongoose = require('mongoose');
var bcrypt = require('bcryptjs');

// User Schema for DB
var UserSchema = mongoose.Schema({
	login: {
		type: String,
		index:true
	},
	password: {
		type: String
	},
	email: {
		type: String
	},
	name: {
		type: String
	},
	surname: {
		type: String
	},
	wallet: {
		usd: {type: Number},
		eur: {type: Number},
		chf: {type: Number},
		rub: {type: Number},
		czk: {type: Number},
		gbp: {type: Number},
		pln: {type: Number}
	}
});

var User = module.exports = mongoose.model('User', UserSchema);

module.exports.createUser = function(newUser, callback){
	bcrypt.genSalt(10, function(err, salt){
	    bcrypt.hash(newUser.password, salt, function(err, hash){
	        newUser.password = hash;
	        newUser.save(callback);
	    });
	});
}

module.exports.getUserByLogin = function(login, callback){
	var query = {login: login};
	User.findOne(query, callback);
}

module.exports.getUserById = function(id, callback){
	User.findById(id, callback);
}

module.exports.getUpdateWallet = function(id, data, callback){
	var update = {};
	update['wallet.' + data.currency] = data.amount;
	update['wallet.pln'] = data.plnamount;
	User.findByIdAndUpdate(id, {$set: update}, function (err, doc){
	  	if(err) throw err;
	  	doc.save(callback);
	});
}

module.exports.editUser = function(id, data, callback){
	if(data.password){
		bcrypt.genSalt(10, function(err, salt){
			bcrypt.hash(data.password, salt, function(err, hash){
		    	data.password = hash;
		    	User.findByIdAndUpdate(id, {$set: data}, function (err, doc){
			  		if(err) throw err;
			  		doc.save(callback);
				});
		    });
		});
	}
	else{
		User.findByIdAndUpdate(id, {$set: data}, function (err, doc){
			if(err) throw err;
			doc.save(callback);
		});
	}

}

module.exports.comparePassword = function(candidatePassword, hash, callback){
	bcrypt.compare(candidatePassword, hash, function(err, isMatch){
    	if(err) throw err;
    	callback(null, isMatch);
	});
}