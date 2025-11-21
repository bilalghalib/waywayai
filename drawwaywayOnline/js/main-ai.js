/**
 * main-ai.js
 * Enhanced version with AI training features
 */
'use strict'

// Initialise application
Board.init('board');
Pen.init(Board.ctx);
FloatingButton.init();
FloatingButton.onClick = Board.clearMemory.bind(Board);
Pointer.onEmpty = _.debounce(onStrokeComplete, 1500);
var allPoints = new Array();

// Current stroke tracking for analyzer
var currentStroke = [];
var currentStrokeStartTime = 0;

// Attach event listener
var pointerDown = function pointerDown(e) {
  // Initialise pointer
  var pointer = new Pointer(e.pointerId);
  pointer.set(Board.getPointerPos(e));

  // Get function type
  Pen.setFuncType(e);
  if (Pen.funcType === Pen.funcTypes.menu) {
    Board.clearMemory();
  } else {
    // Start new stroke
    currentStroke = [];
    currentStrokeStartTime = Date.now();
    drawOnCanvas(e, pointer, Pen);
  }
}

var pointerMove = function pointerMove(e) {
  if (Pen.funcType && (Pen.funcType.indexOf(Pen.funcTypes.draw) !== -1)) {
    var pointer = Pointer.get(e.pointerId);
    drawOnCanvas(e, pointer, Pen);
  }
}

var pointerCancel = function pointerLeave(e) {
  Pointer.destruct(e.pointerId);

  // Stroke complete - analyze it
  if (currentStroke.length > 0) {
    onStrokeComplete();
  }
}

Board.dom.addEventListener('pointerdown', pointerDown);
Board.dom.addEventListener('pointermove', pointerMove);
Board.dom.addEventListener('pointerup', pointerCancel);
Board.dom.addEventListener('pointerleave', pointerCancel);


// Draw method with AI enhancements
function drawOnCanvas(e, pointerObj, Pen) {
  var timeStampInMs = window.performance && window.performance.now && window.performance.timing && window.performance.timing.navigationStart ?
    window.performance.now() + window.performance.timing.navigationStart : Date.now();

  if (pointerObj) {
    pointerObj.set(Board.getPointerPos(e));
    Pen.setPen(Board.ctx, e);

    if (pointerObj.pos0.x < 0) {
      pointerObj.pos0.x = pointerObj.pos1.x - 1;
      pointerObj.pos0.y = pointerObj.pos1.y - 1;
    }

    Board.ctx.beginPath();
    Board.ctx.moveTo(pointerObj.pos0.x, pointerObj.pos0.y)
    Board.ctx.lineTo(pointerObj.pos1.x, pointerObj.pos1.y);
    Board.ctx.closePath();
    Board.ctx.stroke();

    // Enhanced data capture for AI
    var point = {
      timestamp: timeStampInMs,
      dateNow: Date.now(),
      x: pointerObj.pos1.x,
      y: pointerObj.pos1.y,
      x0: pointerObj.pos0.x,
      y0: pointerObj.pos0.y,
      pressure: e.pressure || 0.5,
      tiltX: e.tiltX || 0,
      tiltY: e.tiltY || 0,
      twist: e.twist || 0,
      tangentialPressure: e.tangentialPressure || 0,
      pointerType: e.pointerType,
      width: e.width || 1,
      height: e.height || 1,
      lineWidth: Pen.lineWidth
    };

    // Add to current stroke
    currentStroke.push(point);

	  var packedLine = {
      "Time":timeStampInMs,
      "Date.now":Date.now(),
		  "x0":pointerObj.pos0.x,
      "x1":pointerObj.pos1.x,
      "y0":pointerObj.pos0.y,
		  "y1":pointerObj.pos1.y,
      "lineWidth":Pen.lineWidth
    };

	  allPoints.push({packedLine, ev: e});

    pointerObj.pos0.x = pointerObj.pos1.x;
    pointerObj.pos0.y = pointerObj.pos1.y;
	}
}

// Called when stroke is complete
function onStrokeComplete() {
  if (currentStroke.length < 2) {
    currentStroke = [];
    return;
  }

  // Analyze the stroke
  var analysis = StrokeAnalyzer.analyzeStroke(currentStroke);

  if (analysis) {
    // Store analyzed stroke
    StrokeAnalyzer.allStrokes.push(analysis);
    StrokeAnalyzer.updateSessionStats(analysis);

    // Update UI
    StrokeAnalyzer.updateUI();

    console.log('Stroke analyzed:', analysis);
  }

  // Reset for next stroke
  currentStroke = [];

  // Original callback
  Board.storeMemory();
}

// Override Board.clearMemory to also reset analyzer
var originalClearMemory = Board.clearMemory;
Board.clearMemory = function() {
  originalClearMemory.call(Board);
  StrokeAnalyzer.reset();
  allPoints = [];
};

// Enhanced save function that includes analysis
window.saveDynamicDataToFileEnhanced = function() {
  // Get stroke analysis data
  var analysisData = StrokeAnalyzer.exportAnalysis();

  // Call original save function
  saveDynamicDataToFile();

  // Also send analysis data (if the function exists)
  if (typeof sendAnalysisToServer !== 'undefined') {
    sendAnalysisToServer(analysisData);
  }
};
