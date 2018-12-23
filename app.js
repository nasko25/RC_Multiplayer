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
var io = require("socket.io")(serv, {}); // loads the file ("socket.io") and initilizes it; it returns an io object that 
// has all the functionalities of the socket.io library
io.sockets.on("connection", function(socket) { // the function will be called, whenever there is a connection to the server.
  console.log("Socket connection");
  socket.id = Math.random(); // this assigns a unique id to the newly created socket. 
  socket.x = 0;
  socket.y = 0;   // assign x and y parameters to the socket. 
  SOCKET_LIST[socket.id] = socket; // add the socket to the list of sockets. 
  
  socket.on("happy", function(data){    // this is listening for an emitted "happy" message from the client, and executes the function, if there is one.
    // data ^ is the recieved object that the client sent. (reason, in this case, is contained in the data object) 
    console.log("happy "  + data.reason);
  });
  
  // you can also emit from the server (with socket.io), and listen on the client
  socket.emit("serverMsg", {
    msg:"Server says hello"
  });
  
});

setInterval(function() { // this is a loop; the function will be called every frame and will run at 25 fps (it will be called every 40 milliseconds)
  var pack = []; // every frame a package called pack is created; it will be send to every player connected & will conatin info about every connected player.
  for (var i in SOCKET_LIST) {
    // console.log(Object.keys(SOCKET_LIST).length + " " + i) // this logs the length of the array SOCKET_LIST (it is an object, so we need the Object.keys...) and i.
    var socket = SOCKET_LIST[i];
    socket.x++;
    socket.y++;
    pack.push({
      x:socket.x,
      y:socket.y
    });
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