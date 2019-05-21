Inventory = function(socket) {
	var self = {
		items:[], // {id:"itemid", amount:1}
		socket:socket
	};
	
	self.addItem = function(id, amount) {
		for(var i = 0; i < self.items.length; i++) {
			if(self.items[i].id === id) {
				self.items[i].amount += amount;
				self.refreshRender();
				return;
			}
		}
		self.items.push({id:id, amount:amount});
		self.refreshRender();
	}
	
	self.removeItem = function(id, amount) {
		for(var i = 0; i < self.items.length; i++) {
			if (self.items[i].id === id) {
				self.items[i].amount -= amount;
				if(self.items[i].amount <= 0)
					self.items.splice(i, 1);
				self.refreshRender();
				return;
			}
		}
	}
	
	self.hasItem = function(id, amount) {
		for( var i = 0; i < self.items.length; i++ ) {
			if (self.items[i].id === id) {
				return self.items.amount >= amount;
			}
		}
		return false;
	}
	
	self.refreshRender = function() {
		// server
		if (self.socket) {
			self.socket.emit("updateInventory", self.items);
			return; 
		}
		
		
		// client
		var inventory = document.getElementById("inventory"); 
		inventory.innerHTML = "";
		var addButton = function(data) {
			let item = Item.List[data.id];
			let button = document.createElement("button");
			button.onclick = function() {
				Item.List[item.id].event();
			}
			button.innerText = item.name + " x" + data.amount;
			inventory.appendChild(button);
		}
		
		for (var i = 0; i < self.items.length; i++) {
			addButton(self.items[i])
		}
		
	}
	
	return self;
}

Item = function(id, name, event) {
	var self = {
		id: id, 
		name: name, 
		event: event
	};
	Item.List[self.id] = self;
	return self; 
}

Item.List = {};

Item("potion", "Potion", function() {
	player.hp = 10;
	playerIntentory.removeItem("potion", 1);
}); 

Item("enemy", "Spawn Enemy", function(){
	Enemy.randomlyGenerate();
});