var timer;
var updateStarted = false;
var touch;
var canvas;
var ctx;
var w = 0;
var h = 0;
var obj = document.getElementById('obj');
console.log('obj', obj)

var colors = {
	lightBlue: "#6BCAE2",
};

// var canvas = document.getElementById('touchable');
// var context = canvas.getContext('2d');
// var centerX = canvas.width / 2;
// var centerY = canvas.height / 2;
// var radius = 5;

// context.beginPath();
// context.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
// context.fillStyle = colors.lightBlue;
// context.fill();
// context.lineWidth = 5;
// context.strokeStyle = colors.lightBlue;
// context.stroke();


function update() {
	if (updateStarted) return;
	updateStarted = true;

	var nw = window.innerWidth;
	var nh = window.innerHeight;

	if ((w != nw) || (h != nh)) {
		w = nw;
		h = nh;
		canvas.style.width = w+'px';
		canvas.style.height = h+'px';
		canvas.width = w;
		canvas.height = h;
	}

	if (touch) {
		console.log('touch', touch, 'ctx', ctx)
		ctx.clearRect(0, 0, w, h);

    	var px = touch.pageX;
    	var py = touch.pageY;

		ctx.beginPath();
		ctx.arc(px, py, 20, 0, 2*Math.PI, true);

		ctx.fillStyle = colors.lightBlue;
		ctx.fill();

		ctx.lineWidth = 2.0;
		ctx.strokeStyle = "rgba(0, 0, 200, 0.8)";
		ctx.stroke();

	}

	updateStarted = false;
	touch = null;
}


function move(t) {
	console.log('move', t.pageX, t.pageY)
	touch = t;

		
	// Place element where the finger is
	obj.style.left = t.pageX + 'px';
	obj.style.top = t.pageY + 'px';
}


function main() {
	canvas = document.getElementById('touchable');
	ctx = canvas.getContext('2d');
	timer = setInterval(update, 15);
}





var eventCapture = false; // you probably want to use this as true!


var touchable = document.getElementById('touchable');
console.log('touchable', touchable)
touchable.addEventListener('touchmove', touchmove, eventCapture);

// my desktop way of simulating touchmove...
touchable.addEventListener('mousemove', mousemove, eventCapture);
touchable.addEventListener('mousedown', mousedown, eventCapture);
touchable.addEventListener('mouseup', mouseup, eventCapture);
touchable.addEventListener('mouseout', mouseup, eventCapture);



function touchmove(e) {
	console.log('touchmove!', e)
	// If there's exactly one finger inside this element
	if (e.targetTouches && e.targetTouches.length == 1) {
		var touch = e.targetTouches[0];
		move({'pageX': touch.pageX, 'pageY': touch.pageY});
	}
}


/* hacky way of simulating touch in desktop browser */
var mouseIsDown = false;
function mousemove(e) {
	if (!mouseIsDown) return;

	move({'pageX': e.pageX, 'pageY': e.pageY});
	//move(e.pageX, e.pageY);
}
function mousedown(e) {
	mouseIsDown = true;
}
function mouseup(e) {
	mouseIsDown = false;
}




main();