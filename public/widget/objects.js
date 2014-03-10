
/* --------------------------------------------------------------- 
			File of Object Classes

s = document.createElement('script');
s.setAttribute('src',"http://4d731c8b.ngrok.com/widget/objects.js");
s.onload=function(){console.log('loaded')};
document.getElementsByTagName("head")[0].appendChild(s);
o = new HotFingerObjects();
w0 = widgets[0];
w = new o.Widget(w0.container,w0.canvas,w0.connection);

function animloop() {
	requestAnimFrame(animloop);
	for (var i=0; i<widgets.length; i++) {
		w.onanimate();
	}
}

--------------------------------------------------------------- */
console.log('local object.js')
document.onreadystatechange = function () {
	console.log('\n*********************',document.readyState,'\n*********************')
    if (document.readyState == "complete") {
        console.log('complete!')
    }
}
var HotFingerObjects = function() {

/* ------------ utility functions ------------- */

function findPos(obj) {
	/* borrowed from http://www.quirksmode.org */
	var curleft = curtop = 0;
	if (obj.offsetParent) {
		do {
			curleft += obj.offsetLeft;
			curtop 	+= obj.offsetTop;
		} while (obj = obj.offsetParent);
	}
	return [curleft,curtop];
};

function setCanvasSize(container, canvas) {
	canvas.width = container.clientWidth;
	canvas.height = container.clientHeight;
}
function setListeners(touchable, moveCallback, untouchCallback) {


	var touchable = touchable;
	var position = findPos(touchable);
	var move = function(e) {
		moveCallback(e.pageX - position[0], e.pageY - position[1])
	}
	var untouch = untouchCallback;


	var eventCapture = false; // you probably want to use this as true!

	touchable.addEventListener('touchstart', touchstart, eventCapture);
	touchable.addEventListener('touchend', touchend, eventCapture);
	touchable.addEventListener('touchmove', touchmove, eventCapture);

	// my desktop way of simulating touchmove...
	touchable.addEventListener('mousedown', mousedown, eventCapture);
	touchable.addEventListener('mouseup', mouseup, eventCapture);
	touchable.addEventListener('mousemove', mousemove, eventCapture);

	function touchstart(e) {
		touchmove(e);
	}
	function touchend(e) {
		untouch();
	}
	function touchmove(e) {
		// If there's exactly one finger inside this element
		if (e.targetTouches && e.targetTouches.length == 1) {
			var touch = e.targetTouches[0];
			move(touch);
		}
	}
	/* hacky way of simulating touch in desktop browser */
	var mouseIsDown = false;
	function mousemove(e) {
		if (!mouseIsDown) return;
		move(e);
	}
	function mousedown(e) {
		mouseIsDown = true;
		move(e);
	}
	function mouseup(e) {
		mouseIsDown = false;
		untouch();
	}
}
/* ------------ utility functions above ------------- */

function Widget(container, canvas, connection) {
	this.name = "I'M LOCAL!";
	this.grid;

	this.connection = connection;
	this.container = container;
	this.canvas = canvas;
	this.ctx;


	var self = this;
	this.recieveUpdate = function(msg) {
		console.log('recieveUpdate', msg)
		self.grid.recieveHotspots(msg.Hotspots)
	}
	this.recievePing = function(msg) {
		console.log('ping --> pong', msg);
	}

	this.onresize = function() {
		console.log('onresize', this);
		setCanvasSize(this.container, this.canvas);
		this.grid.onresize();
	}
	this.onanimate = function() {
		this.grid.onanimate();
	}


	this.init = function() {
		setCanvasSize(this.container, this.canvas);
		this.ctx = this.canvas.getContext('2d');
		this.connection.init({"UPDATE": this.recieveUpdate,
							  "PING": this.recievePing,
						 });

		this.grid = new Grid(this.ctx, this.connection);
	}
	this.init();
} /* end of Widget */
var Connection = function(gridID, WS) {
	/* Each WidgetModule has its own connection 
		handles communication between the local Grid and the server Grid
	*/
	this.ws;
	this.endpoint = (WS + "/connect?grid=" + gridID);
	var self = this;

	/* Heroku will shut down the websocket connection after given time if there is no communication 
		-> Solution: Pings if haven't heard in a while
	*/

	this.interval; // null until setInveral called
	this.PING_INTERVAL = 30000;
	this.lastHeard = Date.now();
	this.pingOnInterval = function() {
		if ((Date.now() - this.lastHeard) > this.PING_INTERVAL) {
			this.sendPing();
		}
	};

	this.send = function(msgBody) {
		this.ws.send(JSON.stringify(msgBody));
	}
	this.sendPing = function() {
		this.send({ "Type": "PING" });
	}
	this.sendMove = function(cellLeft, cellEntered) {
		var msg = { "Type": "MOVE", "Hotspots": {},};
		msg["Hotspots"][String(cellEntered)] = 1;
		if (cellLeft >= 0) {
			msg["Hotspots"][String(cellLeft)] = -1;
		}
		console.log('sending msg', msg)
		this.send(msg);
	}

	var reconnect_tries = 0;
	this.connect = function() {
		reconnect_tries += 1;
		if (reconnect_tries > 2) { return; }

		this.ws = new WebSocket(this.endpoint);
	}
	this.init = function(messageCallbacks, callback) {
		var self = this;
		this.connect();

		this.ws.onmessage = function(event) {
			lastHeard = Date.now();

			var msg = event.data;
			if (typeof msg === "string"){ msg = JSON.parse(msg); }

			if (messageCallbacks[msg.Type])
				messageCallbacks[msg.Type](msg);
			else
				console.log("Recieved unrecognized message type: " + msg.Type);
		};
		this.ws.onopen = function(event) {
			lastHeard = Date.now();
			self.interval = setInterval(function(){self.pingOnInterval()}, self.PING_INTERVAL);
			
			reconnect_tries = 0;
			console.log('this.ws.onopen')
			if (callback) callback();
		};
		this.ws.onclose = function(event) {
			console.log('this.ws.onclose')
			clearInterval(self.interval);
			self.connect();
		}
	}
} /* End of Connection */

function Grid(ctx, connection) {
	this.ctx = ctx;
	this.connection = connection;

	/* This Grid is in control of all drawing on the canvas.  
		On each touchmove event:
			- Redraws the local hot spot (touch) on each move event.
			- Checks if cell of touch has changed.
					if so: updates server

		It draws Circles.  Each Circle draws and erases itself (they fade out).
			Subclasses of Circle:
				LocalTouch
				Hotspot(ctx, cellID, heat) <- heat indicates how large it should be drawn


			Hotspots ----- :

			Hotspot and Touch are both subclasses of Circle (c)

			Each hotspot knows how many redraws it has left and draws its intensity based on redraws_left count

			hotspots = [...]  <-- one array of Hotspots

			on new_hotspots event:

				for(var i=0; i<hotspots.length; i++):
					c = hotspots.shift()
					redraws_left = c.redraw()  <-- needs cellsToCoordinates to know where to draw itself
					
					if (redraws_left):
						hotspots.push(c)

				for (var cellID in new_hotspots):
					new_c = new Hotspot(x, y, new_hotspots[cellID]) <-- draws itself when instantiated
					hotspots.push(c)


			Local Touch path represented by an array of touches [....]

			on move event: move(x,y)

				for(var i=0; i<touches.length; i++):
					c = touches.shift()
					redraws_left = c.redraw()

					if (redraws_left):
						touches.push(c)

				new_c = new Touch(x, y)
	*/

	// coordinates where the finger currently is
	this.hotX;
	this.hotY; 

	this.hotspots = {}; // recieve new hotspots and store them in this dictionary until redraw
	this.circles  = []; // store Cirlces -- Hotspots and Touches alike
	this.touchCell; // the cell where the local finger is

	this.cellSize = 40;

	this.width; // = this.canvas.width / 10; //  (int(width/cellSize))
	this.height;

	this.coordinatesToCell; // {[originX, originY]: cellID} // where origin is for top-left corner of cell
	this.cellsToCoordinates; // {cellID: [originX, originY]}


	this.getCell = function(x, y) {
		/* does work of mapping coordinates to cell */
		if (x == null || y == null) { return null; } /* for some reason null-0 = 0 WTF */

		var originX = x - (x % this.cellSize);
		var originY = y - (y % this.cellSize);
		//console.log('getCell', x, y, originX, originY, this.coordinatesToCell)
		return this.coordinatesToCell[[originX, originY]];
	}
	this.getCellCenter = function(cellID) { 
		/* maps cellID to middle's [x,y] coordinates */
		var coordinates = this.cellsToCoordinates[cellID];
		if (!coordinates) {
			return null;
		}
		var centerX = coordinates[0] + this.cellSize/2;
		var centerY = coordinates[1] + this.cellSize/2;
		return [centerX, centerY];
	}

	this.setup = function() {
		this.coordinatesToCell = {};
		this.cellsToCoordinates = {};

		if (this.ctx.canvas.width < this.cellSize || this.ctx.canvas.height < this.cellSize) {
			return null; //nowhere to put a grid
		}

		this.width = this.ctx.canvas.width - (this.ctx.canvas.width % this.cellSize);
		this.height = this.ctx.canvas.height - (this.ctx.canvas.height % this.cellSize);
		
		var cellID = 0;
		var originX = 0;
		var originY = 0;
		while(originY <= this.height) {
			this.cellsToCoordinates[cellID] = [originX, originY];
			this.coordinatesToCell[[originX, originY]] = cellID;

			cellID += 1;
			originX += this.cellSize;
			if (originX > this.width) {
				originX = 0;
				originY += this.cellSize;
			}
		}
		this.coordinatesToCell.length = cellID;
		this.cellsToCoordinates.length = cellID;
	}
	this.recieveHotspots = function(hotspots) {
		this.hotspots = hotspots;
	}

	var self = this;
	var move = function(x, y) {
		self.hotX = x;
		self.hotY = y;
		//self.redraw() /* for debugging */
	}
	var untouch = function() {
		self.hotX = null;
		self.hotY = null;
	}
	this.redraw = function() {
		// erase/fade out the old stuff
		var len = self.circles.length;
		for (var i=0; i<self.circles.length; i++) {
			self.circles[i].erase();
		}
		for (var i=0; i<len; i++) {
			var c = self.circles.shift();
			var redraws_left = c.draw();

			if (redraws_left) {
				self.circles.push(c);
			}
		}

		if (self.hotspots) {
			for (var hotCell in self.hotspots) {

				var coordinates = self.getCellCenter(hotCell);
				if (coordinates) {
					var new_c = new Hotspot(this.ctx, coordinates[0], coordinates[1], self.hotspots[hotCell]);
					self.circles.push(new_c);
				}		
			}
			self.hotspots = {};
		}

		// add the new touch if it's there
		var cell = self.getCell(self.hotX, self.hotY);
		if (cell == null || cell == undefined) { // could be undefined: hotX/hotY undefined if untouched; or slightly off the grid in the leftover mod space
			return;
		}
		if (cell != self.touchCell) {
			this.connection.sendMove(self.touchCell, cell);

			self.touchCell = cell;
		}


		var new_c = new Touch(this.ctx, self.hotX, self.hotY);
		self.circles.push(new_c);
	}
	this.onanimate = function() {
		this.redraw();
	}
	this.onresize = function() {
		this.setup();
	}


	this.init = function() {
		var self = this;
		setListeners(this.ctx.canvas, move, untouch);
		this.setup();
	}
	this.init();
} /* End of Grid */

function Circle(ctx, x, y) {
	/* Two types subclass Circle:
			Hotspot(x, y, heat) -- foreign spots 
			Touch(x,y) -- local spot
		The Grid owns and maintains Circles
	*/
	this.ctx;
	this.x;
	this.y;
	
	this.lineWidth = 1;
	this.radius;
	this.redraws_left;

	this.color = {'r': 200, 'g': 0, 'b': 200};

	this.getFillColor = function() {
		return ("rgba(" + this.color.r + "," 
						+ this.color.g + "," 
						+ this.color.b + "," 
						//+ "1)");
						+ (this.color.a*this.redraws_left) + ")");
	}

	this.erase = function() {
		var originX = this.x - this.radius - this.lineWidth;
		var originY = this.y - this.radius - this.lineWidth;
		var size = 2*(this.radius + this.lineWidth);
		this.ctx.clearRect(originX, originY, size, size);
	}
	this.draw = function() {
		this.redraws_left --;

		this.ctx.beginPath();
		this.ctx.arc(this.x, this.y, this.radius, 0, 2*Math.PI, true);

		var fill = this.getFillColor();
		this.ctx.fillStyle = fill;
		this.ctx.fill();

		this.ctx.lineWidth = this.lineWidth;
		this.ctx.strokeStyle = fill;
		this.ctx.stroke();
		return this.redraws_left;
	}
	this.init = function(ctx, x, y) {
		this.ctx = ctx;
		this.x = x;
		this.y = y;

		this.draw();
	}
} /* End of Circle */

function Touch(ctx, x, y) {
	this.color = {'r': 200, 'g': 0, 'b': 200, 'a': 0.005};
	this.redraws_left = 20;
	this.radius = 15;
	this.init(ctx, x, y);
}
Touch.prototype = new Circle();
function Hotspot(ctx, x, y, heat) {
	this.color = {'r': 255, 'g': 103, 'b': 0, 'a': 0.001};
	this.redraws_left = 130;
	this.radius = 10*Math.sqrt(heat);
	this.init(ctx, x, y);
}
Hotspot.prototype = new Circle();

// return all of these classes
return {
	Widget: Widget,
	Connection: Connection,
	Grid: Grid,
	Circle: Circle,
	Touch: Touch,
	Hotspot: Hotspot,
}

} /* End of HotFingerClasses */
