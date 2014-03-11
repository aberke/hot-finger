

// var HotFinger = function() {
(function() {

// var HOST = "4d731c8b.ngrok.com";
// var DOMAIN = "http://" + HOST;
// var WS 	   = "ws://" + HOST;

var HOST   = "hot-finger.herokuapp.com";
var DOMAIN = "https://" + HOST;
var WS 	   = "wss://" + HOST;



/* ------------ utility functions below ------------- */

function gridID(container) {
	return container.id.split("-")[1];
}
/* add the canvas as the first child of the container 
	- the widget will handle sizing it on init
*/
function addCanvas(container, gridID) {
	var canvasID = "hot-finger-canvas-" + gridID;
	var canvasHTML = "<canvas id='" + canvasID + "' class='touchable'></canvas>";
	container.innerHTML = canvasHTML + container.innerHTML;
	canvas = document.getElementById(canvasID);
	canvas.style.position = 'absolute';
	return canvas;
}
/* check if canvas is supported -- technique used by modernizr */
function isCanvasSupported(){
	var elem = document.createElement('canvas');
	return !!(elem.getContext && elem.getContext('2d'));
}
function addOnOffButton(container, gridID) {
	var parent = container.parentNode;
	parent.className += " hot-finger-container-parent";

	var onButton = document.createElement('div');
	onButton.id = "hot-finger-on-button-" + gridID;
	onButton.className = 'hot-finger-on-button hot-finger-button';
	onButton.innerHTML = "TURN ON HEATMAP";
	onButton.addEventListener('click', window.toggleHeatMap, false);
	parent.insertBefore(onButton, container);

	var offButton = document.createElement('div');
	offButton.id = "hot-finger-off-button-" + gridID;
	offButton.className = 'hot-finger-off-button hot-finger-button';
	offButton.innerHTML = "TURN OFF HEATMAP";
	parent.insertBefore(offButton, container);
	offButton.onclick = window.toggleHeatMap;
}

function onresize() {
	for (var i=0; i<widgets.length; i++) {
		widgets[i].onresize();
	}
}

function animloop() {
	requestAnimFrame(animloop);
	if (!window.heatMapOn) { return; }
	for (var i=0; i<widgets.length; i++) {
		widgets[i].onanimate();
	}
}
window.toggleHeatMap = function() {
	console.log('toggleHeatMap')
	window.heatMapOn = (!window.heatMapOn);
	var offButtons = document.getElementsByClassName('hot-finger-off-button');
	var onButtons = document.getElementsByClassName('hot-finger-on-button');
	for (var i=0; i<onButtons.length; i++) {
		onButtons[i].style.display = (window.heatMapOn ?  "none" : "inline-block");
	}
	for (var i=0; i<offButtons.length; i++) {
		offButtons[i].style.display = (window.heatMapOn ? "inline-block" : "none");
	}
}
function startupWidgets(){
	window.onresize = onresize;

	toggleHeatMap();

	window.requestAnimFrame = (function(){
		return  window.requestAnimationFrame       ||
				window.webkitRequestAnimationFrame ||
				window.mozRequestAnimationFrame    ||
				function( callback ){
				window.setTimeout(callback, 1000 / 60);
		};
	})();
	animloop(); // start the animation loop
}


var withStyleSheets = function(srcList, callback) {
	for (var i=0; i<srcList.length; i++) {
		if (document.createStyleSheet) {
			document.createStyleSheet(srcList[i]);
		} else {
			var ss = document.createElement("link");
			ss.type = "text/css";
			ss.rel = "stylesheet";
			ss.href = srcList[i];
			document.getElementsByTagName("head")[0].appendChild(ss);
		}
	}
	if (callback) { callback(); }
};
var withScripts = function(srcList, callback) {
	var numScripts = srcList.length;
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
/* ------------ utility functions above ------------- */


/* --------------------------------------------------------------- 
			The Main Action Below
--------------------------------------------------------------- */


this.widgets = []
this.hotFingerObjects;

function main() {
	this.hotFingerObjects = new HotFingerObjects();

	if (!isCanvasSupported()) { return null; }
	

	var widgetContainers = document.getElementsByClassName('hot-finger-widget');
	for (var i=0; i<widgetContainers.length; i++) {
		var container = widgetContainers[i];
		var id = gridID(container);
		addOnOffButton(container, id);
		var canvas = addCanvas(container, id);
		var connection = new this.hotFingerObjects.Connection(id, WS);

		var widget = new this.hotFingerObjects.Widget(container, canvas, connection);
		this.widgets.push(widget);
	}
	startupWidgets();
}
withStyleSheets([DOMAIN + "/widget/widget.css"]);
withScripts([DOMAIN + "/widget/objects.js"], main);

return {widgets: this.widgets};
})();





