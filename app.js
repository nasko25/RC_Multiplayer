// How express works for multiple pages, etc.
// console.log("Hello world");

// npm install v8-profiler - a server side profiler
// var profiler = require("v8-profiler");
// var fs = require("fs")  - file system (included in node.js, like http);

/*
  var startProfiling = function(duration) {
    profiler.startProfiling("1", true); // id = 1
    setTimeout(function() {
      var profile1 = profiler.stopProfiling("1");
      
      profile1.export(function(error, result) {
        fs.writeFile("./profile.cpuprofile", result);
        profile1.delete();
        console.log("Profile saved.");
      })
    }, duration);
  }

startProfiling(10000);
*/

var mongojs = require("mongojs");
var db = mongojs("localhost:27017/Game", ["account", "progress"]);  // mongod --smallfiles --dbpath /home/cabox/workspace/db   to start the database
// mongo - to query; use <name> 

// for example: db.account.insert({username: "b", password:"bb"});

require("./Entity");
require("./client/Inventory");

var express = require("express");
var app = express();
var serv = require("http").Server(app);

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/client/index.html");
});
app.use("/client", express.static(__dirname + "/client"));

serv.listen(80);
console.log("Server started; listening on port 80"); 

SOCKET_LIST = {};


var DEBUG = true;

var USERS = {
  // username:password
  "asd":"asdf",
  "asdf":"asdf",
  "a":"a"
}

var isValidPassword = function(data, cb) {
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

var isUsernameTaken = function(data, cb) {
 db.account.find({username: data.username}, function(err, res) {   // TODO sql injection?
    if (res.length > 0) { 
      cb(true);
    }
    else {
      cb(false);
    }
  });
}

var addUser = function(data, cb) {
   db.account.insert({username: data.username, password:data.password}, function(err) {   
      cb();
  });
}

var io = require("socket.io")(serv, {}); // loads the file ("socket.io") and initilizes it; it returns an io object that 
// has all the functionalities of the socket.io library
io.sockets.on("connection", function(socket) { // the function will be called, whenever there is a connection to the server.
  console.log("Socket connection");
  socket.id = Math.random(); // this assigns a unique id to the newly created socket.  
  SOCKET_LIST[socket.id] = socket; // add the socket to the list of sockets. 
  
  socket.on("signIn", function(data) { // {username, password}
    isValidPassword(data, function(res) {
      if(res) {
          Player.onConnect(socket, data.username);
          socket.emit("signInResponse", {
          success: true
        })
      }
      else {
          socket.emit("signInResponse", {
          success:false
        })
      }
    })
  });
  
   socket.on("signUp", function(data) {
    isUsernameTaken(data, function(res) {
      if(res) {
        socket.emit("signUpResponse", {
          success: false
      })
    }
      else {
        addUser(data, function() {
           socket.emit("signUpResponse", {
              success:true
          })
        });
      }
    });

  });
  
  
  socket.on("happy", function(data){    // this is listening for an emitted "happy" message from the client, and executes the function, if there is one.
    // data ^ is the recieved object that the client sent. (reason, in this case, is contained in the data object) 
    console.log("happy "  + data.reason);
  });
  
  // you can also emit from the server (with socket.io), and listen on the client
  socket.emit("serverMsg", {
    msg:"Server says hello"
  });
  
  
  // when a player disconnects, delete him from the socket list
  socket.on("disconnect", function() { // the disconnect event is done automatically
    delete SOCKET_LIST[socket.id];
    Player.onDisconnect(socket);
  });

  socket.on("evalServer", function(data) {
    if (!DEBUG)
      return;
    
    var res = eval(data);  // eval will evaluate the given js code in the (). It will for example print the value of an expression/variable - for debugging purposes only!!!
    socket.emit("evalAnswer", res);
  });
  
});

setInterval(function() { // this is a loop; the function will be called every frame and will run at 25 fps (it will be called every 40 milliseconds)
  var packs = Entity.getFrameUpdateData();
  
  for (var j in SOCKET_LIST) { 
    var socket = SOCKET_LIST[j];
    socket.emit("update", packs.updatePack);
    // TODO: make the sending of initPack and removePack event based, so that if one player gets removed, an event will be triggered that sends a remove for that player
    if (packs.initPack.player.length !== 0 || packs.initPack.bullet.length !== 0) 
    {  
      socket.emit("init", packs.initPack); 
    }
    if (packs.removePack.player.length !== 0 || packs.removePack.bullet.length !== 0) 
    {  
      socket.emit("remove", packs.removePack);
    }
    
  }

}, 1000/25);

/*
in js:
var a = function() {
  console.log("hello");
};
myFunc(a)
is valid and the same as
myFunc(function() {
  console.log("hello");
});

*/
