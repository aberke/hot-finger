

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


function onresize() {
	for (var i=0; i<widgets.length; i++) {
		widgets[i].onresize();
	}
}
function animloop() {
	requestAnimFrame(animloop);
	for (var i=0; i<widgets.length; i++) {
		widgets[i].onanimate();
	}
}
function startupWidgets(){
	window.onresize = onresize;
	/* pages like Huffpost take forever to fully load and keep changing 
		-- problem: then the touch events look distached from where I draw them.
		-- fix: detect these changes and handle like a resize */
    var lastHeight = document.body.clientHeight, newHeight, timer;
    (function checkDocumentHeight(){
        newHeight = document.body.clientHeight;
        if( lastHeight != newHeight ) { 
            onresize();
        }
        lastHeight = newHeight;
        timer = setTimeout(checkDocumentHeight, 2000);
    })();

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
		// var parent = container.parentNode;
		var id = gridID(container);
		var canvas = addCanvas(container, id);
		var connection = new this.hotFingerObjects.Connection(id, WS);

		var widget = new this.hotFingerObjects.Widget(container, canvas, connection);
		this.widgets.push(widget);
	}
	startupWidgets();
}
var ready = false;
function ifReady() {
	console.log('\n*********************',document.readyState,'\n*********************')

	if (!ready && (document.readyState == "complete")) {
		console.log('complete!')
		ready = true;
		main();
	}
}
withScripts([DOMAIN + "/widget/objects.js"], function() {

	document.onreadystatechange = ifReady;
	ifReady();
});

return {widgets: this.widgets};
})();





