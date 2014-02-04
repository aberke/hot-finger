
/* -------------------------- VILLAGE ---------------------- */

var Connection = function() {
	var ws;


	function connect() {
		var ws = new WebSocket(WEBSOCKET_HOST + '/connect');
		return ws;
	}
	this.init = function(messageCallbacks, callback) {
		ws = connect();

		ws.onmessage = function(event) {
			var msg = event.data;
			if (typeof msg === "string"){ msg = JSON.parse(msg); }

			if (messageCallbacks[msg.Type])
				messageCallbacks[msg.Type](msg);
			else
				console.log("Recieved unrecognized message type: " + msg.Type);
		};
		ws.onopen = function(event) {
			if (callback) callback();
		}
	}
	function send(msgBody) {
		ws.send(JSON.stringify(msgBody));
	}
	this.sendPing = function() {
		var msg = {"Type": "PING",};
		send(msg);
	}
	this.sendMove = function(x, y) {
		var msg = { "Type": "MOVE",
					"Data": {"x":String(x), "y":String(y)}
				  }
		send(msg);
	}
}

var WidgetModule = function(touchable, canvas, context) {
	var self = this;

	this.items = {};  // maps {itemID: DrawableItem}
	this.local;
	this.localID;

	var connection;

	this.touchable = touchable;
	this.canvas = canvas;
	var ctx = context;



	this.recieveDelete = function(msg) {
		var id = msg.Client;
		if (self.items[id]) {
			self.items[id].erase();
			delete self.items[id];
		}
	}
	this.recieveMove = function(msg) {
		console.log('recieveMove', msg, this, this.items)
		var data = msg.Data;
		var id = msg.Client;


		if (self.items[id]) {
			self.items[id].draw(data.x, data.y);
		} else {
			self.items[id] = new ForeignTouch();
			self.items[id].init(data.x, data.y);
		}
	}

	this.recievePing = function(msg) {
		console.log("ping -> pong");
	}



	this.init = function() {
		connection = new Connection();
		connection.init({"MOVE": this.recieveMove,
						 "DELETE": this.recieveDelete,
						 "PING": this.recievePing} );

		Drawable.prototype.ctx 			= ctx;
		LocalTouch.prototype.connection = connection;
		LocalTouch.prototype.touchable	= this.touchable;
		
		this.local = new LocalTouch();
	}

function Drawable() {
	this.x;
	this.y;
	this.x_px;
	this.y_px;
	this.lineWidth = 1;
	this.radius;
	this.color;


	this.ctx;

	this.erase = function() {
		var originX = this.x_px - this.radius - this.lineWidth;
		var originY = this.y_px - this.radius - this.lineWidth;
		var size = 2*(this.radius + this.lineWidth);
		this.ctx.clearRect(originX, originY, size, size);
	}

	this.draw = function(x, y) {
		if (this.x_px)
			this.erase();

		this.x = x;
		this.y = y;
		this.x_px = x - ctx.canvas.offsetLeft;
		this.y_px = y - ctx.canvas.offsetTop;

		this.ctx.beginPath();
		this.ctx.arc(this.x_px, this.y_px, this.radius, 0, 2*Math.PI, true);

		this.ctx.fillStyle = this.color;
		this.ctx.fill();

		this.ctx.lineWidth = this.lineWidth;
		this.ctx.strokeStyle = this.color;
		this.ctx.stroke();
	}

	this.init = function(x, y) {
		this.draw(x, y);
	}
}

function Touch() {
	this.move = function(x, y) {
		if ((y == this.y) && (x == this.x)) { return; }
		
		this.connection.sendMove(x, y);
		this.draw(x, y);
	}
}
Touch.prototype = new Drawable();
function LocalTouch() {
	this.touchable;
	this.color = "rgba(200, 0, 200, 0.2)";
	this.radius = 20;
	var self = this;

	// need closure
	var move = function(x, y) {
		self.move(x, y);
	}
	setListeners(this.touchable, move);
}
LocalTouch.prototype = new Touch();

function ForeignTouch() {
	this.color = "rgba(0, 200, 0, 0.2)";
	this.radius = 10;
}
ForeignTouch.prototype = new Touch();

}


/* --------------------------------------------------------------- */

function setListeners(touchable, callback) {
	var move = callback;


	var eventCapture = false; // you probably want to use this as true!

	touchable.addEventListener('touchstart', touchmove, eventCapture);
	touchable.addEventListener('touchend', touchmove, eventCapture);

	// my desktop way of simulating touchmove...
	touchable.addEventListener('mousedown', mousedown, eventCapture);
	touchable.addEventListener('mouseup', mouseup, eventCapture);


	function touchmove(e) {
		// If there's exactly one finger inside this element
		if (e.targetTouches && e.targetTouches.length == 1) {
			var touch = e.targetTouches[0];
			move(touch.pageX, touch.pageY);
		}
	}


	/* hacky way of simulating touch in desktop browser */
	var mouseIsDown = false;
	function mousemove(e) {
		if (!mouseIsDown) return;

		move(e.pageX, e.pageY);
	}
	function mousedown(e) {
		mouseIsDown = true;
		mouse.innerHTML = "Mouse";
		move(e.pageX, e.pageY);
	}
	function mouseup(e) {
		mouseIsDown = false;
		move(e.pageX, e.pageY); // clientX/clientY picks up the browser
	}
}

