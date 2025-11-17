'use strict'

console.log("Successfully started...");
console.log("Enjoy your drawing!");

// Initialise application
Board.init('board');
Pen.init(Board.ctx);

FloatingButton.init();
FloatingButton.onClick = Board.clearMemory.bind(Board);
Pointer.onEmpty = _.debounce(Board.storeMemory.bind(Board), 1500);
var allPoints = new Array();

// Attach event listener
var pointerDown = function pointerDown(e) {
  // Initialise pointer
  var pointer = new Pointer(e.pointerId);
  pointer.set(Board.getPointerPos(e));
  
  // Get function type
  Pen.setFuncType(e);
  allPoints.push("down");
  if (Pen.funcType === Pen.funcTypes.menu) Board.clearMemory();
  else drawOnCanvas(e, pointer, Pen, true);
}
var pointerMove = function pointerMove(e) {
  if (Pen.funcType && (Pen.funcType.indexOf(Pen.funcTypes.draw) !== -1)) {
    
    var pointer = Pointer.get(e.pointerId);
    drawOnCanvas(e, pointer, Pen);
  }
}
var pointerCancel = function pointerLeave(e) {
  allPoints.push("up");
  Pointer.destruct(e.pointerId);
}

Board.dom.addEventListener('pointerdown', pointerDown);
Board.dom.addEventListener('pointermove', pointerMove);
Board.dom.addEventListener('pointerup', pointerCancel);
Board.dom.addEventListener('pointerleave', pointerCancel);


// Draw method
let prevX = 0, prevY = 0, up = false;
function playOnCanvaspPrev(point) {
  let pointerObj = point.packedLine;
  let distance = Math.sqrt(Math.pow(pointerObj.x0 - prevX, 2) + 
  Math.pow(pointerObj.y0 - prevY, 2));
  //if(pointerObj.x0 == prevX && pointerObj.y0 == prevY)
  if(true)
  {
    Board.ctx.beginPath();
    Board.ctx.moveTo(pointerObj.x0, pointerObj.y0);
    Board.ctx.lineTo(pointerObj.x1, pointerObj.y1);
    Board.ctx.closePath();
    Board.ctx.stroke();
    return;
  }
  prevX = pointerObj.x1, prevY = pointerObj.y1;
}
function getWidthFromPressure(pressure) {
  let p = pressure * 1000;
  return 6.75 - 0.25 * (p / 50);
}
function playOnCanvas(point) {
  if(point == "up" || point == "down") {
    if(point == "up") {
      up = true;
    }
    return;
  }


  let _x = point.ev.clientX + point.ev.offsetX;
  let _y = point.ev.clientY + point.ev.offsetY;
  
  if(up == true) {
    prevX = _x, prevY = _y;
    up = false;
    return;
  }

  if(prevX == 0 && prevY == 0) {
    prevX = _x;
    prevY = _y;
    return;
  }
  Board.ctx.lineWidth = getWidthFromPressure(point.ev.pressure) - 1;
  Board.ctx.beginPath();
  Board.ctx.moveTo(prevX, prevY);
  Board.ctx.lineTo(_x, _y);
  Board.ctx.stroke();
  
  prevX = _x, prevY = _y;
}

function drawOnCanvas(e, pointerObj, Pen, mousedown) {
  var timeStampInMs = window.performance && window.performance.now && window.performance.timing && window.performance.timing.navigationStart ? window.performance.now() + window.performance.timing.navigationStart : Date.now();
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
    var packedLine={ "Time":timeStampInMs, "Date.now":Date.now(), 
    "x0":pointerObj.pos0.x, "x1":pointerObj.pos1.x, "y0":pointerObj.pos0.y,
    "y1":pointerObj.pos1.y,"lineWidth":Pen.lineWidth}
    allPoints.push({packedLine,ev});
    
    pointerObj.pos0.x = pointerObj.pos1.x;
    pointerObj.pos0.y = pointerObj.pos1.y;    
    
  }
}
