// How express works for multiple pages, etc.
// console.log("Hello world");

var express = require("express");
var app = express();
var serv = require("http").Server(app);

app.get("/", function(req, res) {
  res.sendFile(__dirname + "/client/index.html");
});
app.use("/client", express.static(__dirname + "/client"));

serv.listen(3000);
console.log("Server started; listening on port 3000");


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
    self.maxSpd = 10;
  
  var super_update = self.update;
  self.update = function() {
    self.updateSpd();
    super_update(); // this is like calling super.update - it will call the function from the parent class. 
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

var io = require("socket.io")(serv, {}); // loads the file ("socket.io") and initilizes it; it returns an io object that 
// has all the functionalities of the socket.io library
io.sockets.on("connection", function(socket) { // the function will be called, whenever there is a connection to the server.
  console.log("Socket connection");
  socket.id = Math.random(); // this assigns a unique id to the newly created socket.  
  SOCKET_LIST[socket.id] = socket; // add the socket to the list of sockets. 
  
  Player.onConnect(socket);
  
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
  
});

setInterval(function() { // this is a loop; the function will be called every frame and will run at 25 fps (it will be called every 40 milliseconds)
  var pack = Player.update();
 
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