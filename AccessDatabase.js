var mongojs = require("mongojs");
var db = mongojs("localhost:27017/Game", ["account", "progress"]);  // mongod --smallfiles --dbpath /home/cabox/workspace/db   to start the database
// (mongod --dbpath /home/chrome/download\ This\ id\ RC_Multiplayer\ -\ newer/db/)
// mongo - to query; use <name> 

// for example: db.account.insert({username: "b", password:"bb"});


// account: {username: string, password: string};
// progess: {username: string, items: [{id: string, amount: number}]}
AccessDatabase = {}

AccessDatabase.isValidPassword = function(data, cb) {
  // whenever there is an interval between when you call the function, and the function returns a value (like when reading from a database) js needs callback to work. 
  db.account.findOne({username: data.username, password: data.password}, function(err, res) {   // the err will return an error that may have occured while reading, while res is the result (returns an array with
    // every document that matched the query)// TODO sql injection?
    if (res) { // check if there is at least one username with that password
      cb(true);
    }
    else {
      cb(false);
    }
  });
}

AccessDatabase.isUsernameTaken = function(data, cb) {
 db.account.findOne({username: data.username}, function(err, res) {   // TODO sql injection?
    if (res) { 
      cb(true);
    }
    else {
      cb(false);
    }
  });
}

AccessDatabase.addUser = function(data, cb) {
   db.account.insert({username: data.username, password:data.password}, function(err) {  
		// also add an empty progress to the user
		AccessDatabase.savePlayerProgress({username:data.username, items:[]}, function() {
			cb();   // cb is callback 
		});
  });
}

AccessDatabase.getPlayerProgress = function(username, cb) {
	db.progress.findOne({username: username}, function(err, res) {
		cb({items: res.items});
	});
}

AccessDatabase.savePlayerProgress = function(data, cb) {
	cb = cb || function() {}   // with this line, even if you do not provide a cb function, the savePlayerProgress function will work, 
	// as it will create an empty cb function. 
	
	db.progress.update({username: data.username}, data, {upsert:true}, cb); // update will either update an existing entry, or insert a new entry if the entry is not available
	// because of the "upsert" flag
}
