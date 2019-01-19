// How express works for multiple pages, etc.
// console.log("Hello world");

var mongojs = require("mongojs");
var db = mongojs("localhost:27017/Game", ["account", "progress"]);  // mongod --smallfiles --dbpath /home/cabox/workspace/db   to start the database
// mongo - to query; use <name> 

// for example: db.account.insert({username: "b", password:"bb"});

var express = require("express");
var app = express();
var serv = require("http").Server(app);

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/client/index.html");
});
app.use("/client", express.static(__dirname + "/client"));

serv.listen(3000);
console.log("Server started; listening on port 3000");

function sanitize(value) {
  var lt = /</g, 
  gt = />/g, 
  ap = /'/g, 
  ic = /"/g;
  value = value.toString().replace(lt, "&lt;").replace(gt, "&gt;").replace(ap, "&#39;").replace(ic, "&#34;"); 
  return value;
} 

var SOCKET_LIST = {};

var Entity = function() { // Entity is a class cointaing general information for both Player and Bullet.
  var self = { // this is a constructor
    x:250,
    y:250,
    spdX:0,
    spdY:0,
    id:""
  }
  self.update = function() {
    self.updatePosition();
  }
  self.updatePosition = function() {
    self.x += self.spdX;
    self.y += self.spdY;
  }
  self.getDistance = function(pt) {
    return Math.sqrt(Math.pow(self.x-pt.x, 2) + Math.pow(self.y-pt.y, 2));
  }
  return self
}

var Player = function(id){ 
  var self = Entity(); 
    // adding properties on top of the Entity:
    self.id = id;
    self.number = "" + Math.floor(10 * Math.random()); // every player has a random int associated with it. 
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.pressingAttack = false;
    self.mouseAngle = 0;
    self.maxSpd = 10;
  
  var super_update = self.update;
  self.update = function() {
    self.updateSpd();
    super_update(); // this is like calling super.update() - it will call the function from the parent class. 
    
    if (self.pressingAttack) {
      // for (var i = -3; i < 3; i++)
      //  self.shootBullet(i * 10 + self.mouseAngle);   may be a special attack
     self.shootBullet(self.mouseAngle); 
    }
  }
  
  self.shootBullet = function(angle) {
      var b = Bullet(self.id, angle);
      b.x = self.x;
      b.y = self.y;
  }
  
  self.updateSpd = function() { // the updatePosition function will be called every frame
    if (self.pressingRight)
      self.spdX = self.maxSpd;
    else if (self.pressingLeft)
      self.spdX = -self.maxSpd;
    else 
      self.spdX = 0;
    
    if (self.pressingUp)
      self.spdY = -self.maxSpd;
    else if (self.pressingDown)
      self.spdY = self.maxSpd;
    else 
      self.spdY = 0;
  }
  Player.list[id] = self; // just by creating the player, it is added to the list. 
  return self;
};
Player.list = {} // there is only one list for every player
Player.onConnect = function(socket) {
  var player = Player(socket.id);
    
  socket.on("keyPress", function(data){ // adds a listener for every keyPress package
    if(data.inputId === "left")
      player.pressingLeft = data.state;
    else if(data.inputId === "right")
      player.pressingRight = data.state;
    else if(data.inputId === "up")
      player.pressingUp = data.state;
    else if(data.inputId === "down")
      player.pressingDown = data.state;
    else if(data.inputId === "attack")
      player.pressingAttack = data.state;
    else if(data.inputId === "mouseAngle")
      player.mouseAngle = data.state;    
  });
}

Player.onDisconnect = function(socket) {
  delete Player.list[socket.id];
}

Player.update = function() {
  var pack = []; // every frame a package called pack is created; it will be send to every player connected & will conatin info about every connected player.
  for (var i in Player.list) {
    // console.log(Object.keys(SOCKET_LIST).length + " " + i) // this logs the length of the array SOCKET_LIST (it is an object, so we need the Object.keys...) and i.
    var player = Player.list[i];
    player.update();
    pack.push({
      x:player.x,
      y:player.y,
      number:player.number
    });
  }
  return pack;
}

var Bullet = function(parent, angle) {
  var self = Entity();
  self.id = Math.random();
  self.spdX = Math.cos(angle/180*Math.PI) * 10;
  self.spdY = Math.sin(angle/180*Math.PI) * 10;
  self.parent = parent; 
  self.timer = 0;
  self.toRemove = false;
  var super_update = self.update;
  self.update = function() {
    if (self.timer++ > 100)
      self.toRemove = true;
    super_update();
    
    for (var i in Player.list) {
      var p = Player.list[i];
      if(self.getDistance(p) < 32 && self.parent !== p.id) {  // TODO 32 is hard-coded
        // handle collision with HP.
        self.toRemove = true;
      }
    }
  }
  Bullet.list[self.id] = self;
  return self;
}
Bullet.list = {};

Bullet.update = function() { 
  var pack = [];
  for(var i in Bullet.list) {
    var bullet = Bullet.list[i];
    bullet.update();
    if (bullet.toRemove) {
      delete Bullet.list[i];
    }
    else {
      pack.push({
        x:bullet.x,
        y:bullet.y
      }) 
    }
  }
 return pack;
}

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
  
  socket.on("signIn", function(data) {
    isValidPassword(data, function(res) {
      if(res) {
          Player.onConnect(socket);
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

  socket.on("sendMsgToServer", function(data) {
    var playerName = ("" + socket.id).slice(2,7);  // players don't have names, so we use the socket id instead
    
    for (var i in SOCKET_LIST) {
      SOCKET_LIST[i].emit("addToChat", playerName + ":" + sanitize(data));
    }
  });
  
  socket.on("evalServer", function(data) {
    if (!DEBUG)
      return;
    
    var res = eval(data);  // eval will evaluating the given js code in the (). It will for example print the value of an expression/variable - for debugging purposes only!!!
    socket.emit("evalAnswer", res);
  });
  
});

setInterval(function() { // this is a loop; the function will be called every frame and will run at 25 fps (it will be called every 40 milliseconds)
  var pack = {
    player:Player.update(),
    bullet:Bullet.update()
  } 
  
  for (var j in SOCKET_LIST) { 
    var socket = SOCKET_LIST[j];
    socket.emit("newPositions", pack);
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