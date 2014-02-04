
var WEBSOCKET_HOST = "ws://7f5cb0b2.ngrok.com";


var timer;
var updateStarted = false;
var touch;
var container;
var canvas;
var ctx;
var w = 0;
var h = 0;
var mouse = document.getElementById('mouse');


var colors = {
	lightBlue: "#6BCAE2",
};


function setCanvasSize() {
	canvas.width = container.clientWidth;
	canvas.height = container.clientHeight;
}
window.onresize = setCanvasSize;

/* add the canvas as the first child of the container */
function addCanvas(container) {
	var canvasHTML = "<canvas id='touchable-canvas' class='touchable'></canvas>";
	container.innerHTML = canvasHTML + container.innerHTML;
	canvas = document.getElementById('touchable-canvas');
	ctx = canvas.getContext('2d');

	canvas.style.position = 'absolute';
	setCanvasSize();

}
/* check if canvas is supported -- technique used by modernizr */
function isCanvasSupported(){
	var elem = document.createElement('canvas');
	return !!(elem.getContext && elem.getContext('2d'));
}

function main() {
	if (!isCanvasSupported()) { return null; }

	container = document.getElementById('readTouch-widget');

	addCanvas(container);
	setListeners(container, move);

	//timer = setInterval(update, 15);


	this.module = new WidgetModule(container, canvas, ctx);
	this.module.init();
}




function update() {
	if (updateStarted) return;
	updateStarted = true;

	var nw = canvas.width;
	var nh = canvas.height;

	var offsetLeft = canvas.offsetLeft;
	var offsetTop = canvas.offsetTop;

	if ((w != nw) || (h != nh)) {
		w = nw;
		h = nh;
		canvas.style.width = w+'px';
		canvas.style.height = h+'px';
	}

	if (touch) {
		console.log('touch', touch, 'offsetLeft', offsetLeft, 'offsetTop', offsetTop)
		ctx.clearRect(0, 0, w, h);

    	var px = touch.pageX;
    	var py = touch.pageY;

		ctx.beginPath();
		ctx.arc(px - offsetLeft, py - offsetTop, 20, 0, 2*Math.PI, true);

		ctx.fillStyle = colors.lightBlue;
		ctx.fill();

		ctx.lineWidth = 2.0;
		ctx.strokeStyle = "rgba(200, 0, 0.8)";
		ctx.stroke();

	}

	updateStarted = false;
	touch = null;
}


function move(x, y) {
	touch = {'pageX': x, 'pageY': y};
}











main();