

var HotFinger = function() {
var HOST = "fb92612.ngrok.com";
var DOMAIN = "http://" + HOST;
var WS 	   = "ws://" + HOST;
console.log(WS)

// var HOST   = "hot-finger.herokuapp.com";
// var DOMAIN = "https://" + HOST;
// var WS 	   = "wss://" + HOST;


var ModuleFunctions = function() {
	/* I want the functions below to be Global within all HotFinger stuff
		-> I want the Object Classes to have access
			BUT I also want the classes in their own file
	*/	
	this.HOST = HOST;
	this.DOMAIN = DOMAIN;
	this.WS = WS;
console.log(this.WS)


	function setListeners(touchable, moveCallback, untouchCallback) {
		var touchable = touchable;
		var move = function(e) {
			moveCallback(e.pageX - touchable.offsetLeft, e.pageY - touchable.offsetTop)
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

	function gridID(container) {
		return container.id.split("-")[1];
	}
	/* add the canvas as the first child of the container */
	function addCanvas(container, gridID) {
		var canvasID = "hot-finger-canvas-" + gridID;
		var canvasHTML = "<canvas id='" + canvasID + "' class='touchable'></canvas>";
		container.innerHTML = canvasHTML + container.innerHTML;
		canvas = document.getElementById(canvasID);

		canvas.style.position = 'absolute';
		setCanvasSize(container, canvas);
		return canvas;
	}
	/* check if canvas is supported -- technique used by modernizr */
	function isCanvasSupported(){
		var elem = document.createElement('canvas');
		return !!(elem.getContext && elem.getContext('2d'));
	}
	function setCanvasSize(container, canvas) {
		canvas.width = container.clientWidth;
		canvas.height = container.clientHeight;
	}

	return {
		setCanvasSize: setCanvasSize,
		addCanvas: addCanvas,
		isCanvasSupported: isCanvasSupported,
		setListeners: setListeners,
		gridID: gridID,
		withScripts: withScripts,
		HOST: this.HOST,
		DOMAIN: this.DOMAIN,
		WS: this.WS,
	}
} /* End of ModuleFunctions */







window.requestAnimFrame = (function(){
	return  window.requestAnimationFrame       ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame    ||
			function( callback ){
			window.setTimeout(callback, 1000 / 60);
	};
})();
function animloop() {
	requestAnimFrame(animloop);
	for (var i=0; i<widgets.length; i++) {
		widgets[i].onanimate();
	}
}
function onresize() {
	for (var i=0; i<widgets.length; i++) {
		widgets[i].onresize();
	}
}
var withScripts = function(srcList, callback) {
	var numScripts = srcList.length;
	console.log('withScripts', numScripts, srcList)
	var numLoaded = 0;
    function scriptLoaded() {
        numLoaded++;
        if (numLoaded === numScripts) {
            callback();
        }
    }
	for (var i=0; i<numScripts; i++) {

		var script_tag = document.createElement('script');
		script_tag.setAttribute("type","text/javascript");
		script_tag.setAttribute("src", srcList[i]);
		if (script_tag.readyState) {
			script_tag.onreadystatechange = function () { // For old versions of IE
				if (this.readyState == 'complete' || this.readyState == 'loaded') {
					scriptLoaded();
				}
			};
		} else {
			script_tag.onload = scriptLoaded;
		}
		// Try to find the head, otherwise default to the documentElement
		(document.getElementsByTagName("head")[0] || document.documentElement).appendChild(script_tag);
	}
	if (!numScripts) {
		callback();
	}
};


/* --------------------------------------------------------------- 
			The Main Action Below
--------------------------------------------------------------- */


this.widgets = []
this.hotFingerObjects;
this.moduleFunctions;

function main() {
	this.moduleFunctions = new ModuleFunctions();
	this.hotFingerObjects = new HotFingerObjects();
	HotFingerObjects.prototype.moduleFunctions = this.moduleFunctions;

	if (!this.moduleFunctions.isCanvasSupported()) { return null; }

	var widgetContainers = document.getElementsByClassName('hot-finger-widget');
	for (var i=0; i<widgetContainers.length; i++) {
		var container = widgetContainers[0];
		// var parent = container.parentNode;
		var gridID = this.moduleFunctions.gridID(container);
		var canvas = this.moduleFunctions.addCanvas(container, gridID);
		var connection = new this.hotFingerObjects.Connection(gridID);

		var widget = new this.hotFingerObjects.Widget(container, canvas, connection);
		this.widgets.push(widget);
	}
	window.onresize = onresize;

	// start the animation loop
	animloop();
}
withScripts([DOMAIN + "/widget/objects.js"], main);

return {widgets: this.widgets};
}();





