
/* -------------------------- VILLAGE ---------------------- */

var Connection = function() {
	var ws;
	var endpoint = "/connect";
	var gridID = "1";


	function connect() {
		var ws = new WebSocket(WEBSOCKET_HOST + endpoint + '?grid=' + gridID);
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

	this.sendMove = function(cellLeft, cellEntered) {
		var msg = { "Type": "MOVE", "Hotspots": {},};
		msg["Hotspots"][String(cellEntered)] = 1;
		if (cellLeft) {
			msg["Hotspots"][String(cellLeft)] = -1;
		}
		console.log('msg', msg)
		send(msg);
	}
}

var WidgetModule = function(touchable, canvas, context) {
	var self = this;

	this.items = {};  // maps {itemID: DrawableItem}
	this.local;
	this.localID;

	this.grid;

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
		// TODO: MAKE THIS BETTER 
	function redrawAll() {
		// TODO: MAKE THIS BETTER 
		for (var ID in self.items) {
			self.items[ID].redraw();
		}
		self.local.redraw();		
	}

	var self = this;
	this.recieveUpdate = function(msg) {
		console.log('recieveUpdate', msg, this, this.items)
		for (var hotCell in msg.Hotspots) {
			console.log(hotCell, msg.Hotspots[hotCell])
			
		}
		self.grid.recieveHotspots(msg.Hotspots)
	}



	this.init = function() {
		connection = new Connection();
		connection.init({"UPDATE": this.recieveUpdate,
						 "DELETE": this.recieveDelete,
						 });
		
		Grid.prototype.ctx 	= ctx;
		Circle.prototype.ctx= ctx;

		this.grid = new Grid();
	}

function Grid() {
	/* This Grid is in control of all drawing on the canvas.  
		On each touchmove event:
			- Redraws the local hot spot (touch) on each move event.
			- Checks if cell of touch has changed.
					if so: updates server

		It draws Circles.  Each Circle draws and erases itself (they fade out).
			Subclasses of Circle:
				LocalTouch
				Hotspot(ctx, cellID, heat) <- heat indicates how large it should be drawn


			Hotspots:

				Idea 1:
					set of arrays
						decay_arrays = [decay0, decay1, ..., decay5]

						decay0 = [] // newest hotspots -- draw most bright
						decay1 = []	// one update old -- draw less bright
						decay2 = [] // etc	
							...
						decay5 = [] // draw least bright -- after this they'll be invisible (gone)
					
					on each update:

						//recieve new hotspots data object {cellID: heat}:
						new_hotspots

						for (var i=0; i<decay_arrays.length; i++)
							d_array = decay_arrays[i]
							
							for (var j=0; j<d_array.length; j++)
								h = d_array.pop()
								h.redraw(cellsToCoordinates, i)  <-- i indicates intensity. h already knows its heat (size)
																<-- needs cellsToCoordinates to know where to draw itself
								if (j+1 < i):
									decay_arrays[j+1].push(h)
						
						for (var cellID in new_hotspots):
							new_h = Hotspot(cellID, new_hotspots[cellID]) <-- draws itself when instantiated
							decay_arrays[0].push(h)

				Idea 2:

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



		TODO: setup again on resize events
	*/
	var interval;

	// coordinates where the finger currently is
	this.hotX;
	this.hotY; 

	this.hotspots = {}; // recieve new hotspots and store them in this dictionary until redraw
	this.circles  = []; // store Cirlces -- Hotspots and Touches alike
	this.touchCell; // the cell where the local finger is

	this.cellSize = 50;

	this.width; // = this.canvas.width / 10; //  (int(width/cellSize))
	this.height;

	this.coordinatesToCell; // {[originX, originY]: cellID} // where origin is for top-left corner of cell
	this.cellsToCoordinates; // {cellID: [originX, originY]}


	this.getCell = function(x, y) {
		/* does work of mapping coordinates to cell */
		var originX = x - (x % this.cellSize);
		var originY = y - (y % this.cellSize);
		return this.coordinatesToCell[[originX, originY]];
	}
	this.getCellCenter = function(cellID) { 
		/* maps cellID to middle's [x,y] coordinates */
		var coordinates = this.cellsToCoordinates[cellID];
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
		while(originY < this.height) {
			this.cellsToCoordinates[cellID] = [originX, originY];
			this.coordinatesToCell[[originX, originY]] = cellID

			cellID += 1;
			originX += this.cellSize;
			if (originX >= this.width) {
				originX = 0;
				originY += this.cellSize;
			}
		}
		console.log('this.cellsToCoordinates', this.cellsToCoordinates)
		console.log('this.coordinatesToCell', this.coordinatesToCell);

	}
	this.recieveHotspots = function(hotspots) {
		console.log('recieveHotspots', hotspots)
		this.hotspots = hotspots;
		console.log(this.hotspots)
	}

	var self = this;
	var move = function(x, y) {
		self.hotX = x;
		self.hotY = y;
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

				console.log('hotCell', hotCell, self.hotspots[hotCell])
				var coordinates = self.getCellCenter(hotCell);			

				var new_c = new Hotspot(coordinates[0], coordinates[1], self.hotspots[hotCell]);
				self.circles.push(new_c);
			}
			self.hotspots = {};
		}


		// add the new touch if it's there
		var cell = self.getCell(self.hotX, self.hotY);
		if (!cell) { // could be undefined: hotX/hotY undefined if untouched; or slightly off the grid in the leftover mod space
			return;
		}
		if (cell != self.touchCell) {
			connection.sendMove(self.touchCell, cell);

			self.touchCell = cell;
		}


		var new_c = new Touch(self.hotX, self.hotY);
		self.circles.push(new_c);
	}


	this.init = function() {
		var self = this;
		setListeners(this.ctx.canvas, move, untouch);
		this.setup();

		// start the update loop
		interval = setInterval(this.redraw, 50);
	}
	this.init();
}

function Circle(x, y) {
	/* Two types subclass Circle:

		Hotspot(x, y, heat) -- foreign spots 
		Touch(x,y) -- local spot 
	*/
	this.x;
	this.y;
	this.x_px;
	this.y_px;
	
	this.lineWidth = 1;
	this.radius;
	this.redraws_left;

	this.color = {'r': 200, 'g': 0, 'b': 200};

	this.getFillColor = function() {
		return ("rgba(" + this.color.r + "," 
						+ this.color.g + "," 
						+ this.color.b + "," 
						+ (0.01*this.redraws_left) + ")");
	}

	this.erase = function() {
		var originX = this.x_px - this.radius - this.lineWidth;
		var originY = this.y_px - this.radius - this.lineWidth;
		var size = 2*(this.radius + this.lineWidth);
		this.ctx.clearRect(originX, originY, size, size);
	}

	this.draw = function() {
		this.redraws_left --;

		this.ctx.beginPath();
		this.ctx.arc(this.x_px, this.y_px, this.radius, 0, 2*Math.PI, true);

		var fill = this.getFillColor();
		this.ctx.fillStyle = fill;
		this.ctx.fill();

		this.ctx.lineWidth = this.lineWidth;
		this.ctx.strokeStyle = fill;
		this.ctx.stroke();

		return this.redraws_left;
	}
	this.init = function(x, y) {
		this.x = x;
		this.y = y;
		this.x_px = x - this.ctx.canvas.offsetLeft;
		this.y_px = y - this.ctx.canvas.offsetTop;

		this.draw();
	}
}

function Touch(x, y) {
	this.redraws_left = 20;
	this.radius = 20;

	this.init(x, y);
}
Touch.prototype = new Circle();

function Hotspot(x, y, heat) {
	this.color = {'r': 200, 'g': 0, 'b': 0};
	this.redraws_left = 100;
	this.radius = 10*Math.sqrt(heat);
	console.log('Hotspot', x, y, heat, this.radius)

	this.init(x, y);
}
Hotspot.prototype = new Circle();


}


/* --------------------------------------------------------------- */

function setListeners(touchable, moveCallback, untouchCallback) {
	var move = moveCallback;
	var untouch = untouchCallback;


	var eventCapture = false; // you probably want to use this as true!
	var eventCapture = false; // you probably want to use this as true!

	touchable.addEventListener('touchstart', touchstart, eventCapture);
	touchable.addEventListener('touchend', touchend, eventCapture);
	touchable.addEventListener('touchmove', touchmove, eventCapture);

	// my desktop way of simulating touchmove...
	touchable.addEventListener('mousedown', mousedown, eventCapture);
	touchable.addEventListener('mouseup', mouseup, eventCapture);
	touchable.addEventListener('mousemove', mousemove, eventCapture);


	function touchstart(e) {
		console.log('touchstart')
		touchmove(e);
	}
	function touchend(e) {
		console.log('touchend')
		untouch();
	}


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
		untouch();
		//move(e.pageX, e.pageY); // clientX/clientY picks up the browser
	}
}

