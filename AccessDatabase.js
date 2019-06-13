var mongojs = require("mongojs");
var db = mongojs("localhost:27017/Game", ["account", "progress"]);  // mongod --smallfiles --dbpath /home/cabox/workspace/db   to start the database
// mongo - to query; use <name> 

// for example: db.account.insert({username: "b", password:"bb"});

AccessDatabase = {}

AccessDatabase.isValidPassword = function(data, cb) {
  // whenever there is an interval between when you call the function, and the function returns a value (like when reading from a database) js needs callback to work. 
  db.account.find({username: data.username, password: data.password}, function(err, res) {   // the err will return an error that may have occured while reading, while res is the result (returns an array with
    // every document that matched the query)// TODO sql injection?
    if (res.length > 0) { // check if there is at least one username with that password
      cb(true);
    }
    else {
      cb(false);
    }
  });
}

AccessDatabase.isUsernameTaken = function(data, cb) {
 db.account.find({username: data.username}, function(err, res) {   // TODO sql injection?
    if (res.length > 0) { 
      cb(true);
    }
    else {
      cb(false);
    }
  });
}

AccessDatabase.addUser = function(data, cb) {
   db.account.insert({username: data.username, password:data.password}, function(err) {   
      cb();
  });
}
