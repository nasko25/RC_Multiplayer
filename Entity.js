
var initPack = {player:[], bullet:[]};
var removePack = {player:[], bullet:[]};

function sanitize(value) {
  var lt = /</g, 
  gt = />/g, 
  ap = /'/g, 
  ic = /"/g;
  value = value.toString().replace(lt, "&lt;").replace(gt, "&gt;").replace(ap, "&#39;").replace(ic, "&#34;"); 
  return value;
}

Entity = function(param) { // Entity is a class cointaing general information for both Player and Bullet.
  var self = { // this is a constructor
    x:250,
    y:250,
    spdX:0,
    spdY:0,
    id:"",
    map:"forest"
  }
  if (param) {
    if(param.x)
      self.x = param.x;
    if(param.y)
      self.y = param.y;
    if(param.map)
      self.map = param.map;
    if(param.id)
      self.id = param.id;
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
Entity.getFrameUpdateData = function() {

  var pack = {
    initPack:{
		player:initPack.player,
		bullet:initPack.bullet
	},
	removePack:{
		player:removePack.player,
		bullet:removePack.bullet
	},
	updatePack:{
		player:Player.update(),
		bullet:Bullet.update()
	}
  }; 
  
 initPack.player = [];
 initPack.bullet = [];
 removePack.player = [];
 removePack.bullet = [];
 
 return pack;
 
}


Player = function(param){ 
  var self = Entity(param); 
    // adding properties on top of the Entity:
    self.number = "" + Math.floor(10 * Math.random()); // every player has a random int associated with it. 
	self.username = param.username;
    self.pressingRight = false;
    self.pressingLeft = false;
    self.pressingUp = false;
    self.pressingDown = false;
    self.pressingAttack = false;
    self.mouseAngle = 0;
    self.maxSpd = 10;
    self.hp = 10;
    self.hpMax = 10;
    self.score = 0;
	self.inventory = new Inventory(param.socket);
  
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
      Bullet({
        parent:self.id, 
        angle:angle,
        x:self.x,
        y:self.y,
        map:self.map
      });
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
  
  self.getInitPack = function() {
    return {
    id:self.id,
    x:self.x,
    y:self.y,
    number: self.number,
    hp: self.hp,
    hpMax:self.hpMax,
    score:self.score,
    map:self.map
    }
  }
  
  self.getUpdatePack = function() {
    return {
      id:self.id,
      x:self.x,
      y:self.y,
      hp: self.hp,
      score: self.score,
      map:self.map
    }
  }
  
  Player.list[self.id] = self; // just by creating the player, it is added to the list. 
  initPack.player.push(self.getInitPack());
  return self;
};
Player.list = {} // there is only one list for every player
Player.onConnect = function(socket, username) {
  var map = "forest";
  if(Math.random() < 0.5) {
    map = "field";
  }
  var player = Player({
	username: username, 
    id:socket.id,
    map:map,
	socket:socket
  });
    
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

  socket.on("changeMap", function() {
    if (player.map === "field")
      player.map = "forest";
    else 
      player.map = "field";
  });
  
  
  socket.on("sendMsgToServer", function(data) {
    for (var i in SOCKET_LIST) {
      SOCKET_LIST[i].emit("addToChat", player.username + ":" + sanitize(data));
    }
  });
  
 socket.on("sendPmToServer", function(data) { // data: {username, message}
    var recipientSocket = null;
    for (var i in Player.list) {
	if (Player.list[i].username === data.username)
	    recipientSocket = SOCKET_LIST[i]; // i is the id of the player
    }
    if (recipientSocket === null) {
    	socket.emit("addToChat", "The player " + data.username + " is not online.");
    }
    else {
    	recipientSocket.emit("addToChat", "From " + player.username + ":" + data.message);
   	socket.emit("addToChat", "To " + data.username + ":" + data.message);
    }
 });

  socket.emit("init", {
    selfId:socket.id,
    player:Player.getAllInitPacks(),
    bullet:Bullet.getAllInitPacks()
  })
  
}

Player.getAllInitPacks = function() {
  var players = [];
  for (var i in Player.list)
    players.push(Player.list[i].getInitPack());
  return players;
}

Player.onDisconnect = function(socket) {
  removePack.player.push(socket.id);
  delete Player.list[socket.id];
}

Player.update = function() {
  var pack = []; // every frame a package called pack is created; it will be send to every player connected & will conatin info about every connected player.
  for (var i in Player.list) {
    // console.log(Object.keys(SOCKET_LIST).length + " " + i) // this logs the length of the array SOCKET_LIST (it is an object, so we need the Object.keys...) and i.
    var player = Player.list[i];
    player.update();
    pack.push(player.getUpdatePack());
  }
  return pack;
}

Bullet = function(param) {
  var self = Entity(param);
  self.id = Math.random();
  self.angle = param.angle;
  self.spdX = Math.cos(param.angle/180*Math.PI) * 10;
  self.spdY = Math.sin(param.angle/180*Math.PI) * 10;
  self.parent = param.parent; 
  self.timer = 0;
  self.toRemove = false;
  var super_update = self.update;
  self.update = function() {
    if (self.timer++ > 100)
      self.toRemove = true;
    super_update();
    
    for (var i in Player.list) {
      var p = Player.list[i];
      if(self.getDistance(p) < 32 && self.parent !== p.id && self.map === p.map) {  // TODO 32 is hard-coded
        // handle collision with HP.
        p.hp--;

        if(p.hp <= 0) {        
          var shooter = Player.list[self.parent];
          if(shooter) {
            shooter.score++;
          }
          p.hp = p.hpMax;
          p.x = Math.random()*500;
          p.y = Math.random()*500;
        }
        
        self.toRemove = true;
      }
    }
  }
  
  self.getInitPack = function() {
    return {
    id:self.id, /*
    x:self.x,
    y:self.y
 */ 
    map:self.map
    }; // TODO should they be sent when the bullet is initilized?
  }
  
  self.getUpdatePack = function() {
    return {
        id:self.id,
        x:self.x,
        y:self.y
    };
  }
  
  Bullet.list[self.id] = self;
  initPack.bullet.push(self.getInitPack());    // TODO should they be sent when the bullet is initilized?
  return self;
}
Bullet.list = {};

Bullet.update = function() { 
  var pack = [];
  for(var i in Bullet.list) {
    var bullet = Bullet.list[i];
    bullet.update();
    if (bullet.toRemove) {
      removePack.bullet.push(bullet.id);
      delete Bullet.list[i];
    }
    else {
      pack.push(bullet.getUpdatePack()); 
    }
  }
 return pack;
}

Bullet.getAllInitPacks = function() {
  var bullets = [];
  for (var j in Bullet.list)
    bullets.push(Bullet.list[j].getInitPack());
  return bullets;
}
