
const GIFEncoder = require('gif-encoder-2')
const { createCanvas } = require('canvas')
const { writeFile } = require('fs')
var fs = require('fs');
const path = require('path')

require.extensions['.txt'] = function (module, filename) {
    module.exports = fs.readFileSync(filename, 'utf8');
};



let drawings = {}, drawing_index = 0;
let runFlag = 0, interval = false;

let prevX = 0, prevY = 0, up = false;

const size_width = 1430
const size_height = 722
const half = size_width / 2

const canvas = createCanvas(size_width, size_height)
const ctx = canvas.getContext('2d')

const encoder = new GIFEncoder(size_width, size_height)
encoder.setFrameRate(200)
encoder.start()

var drawingText = require("./drawme.txt");
console.log(drawingText); // string
drawingsJSON = JSON.parse(drawingText);
console.log(drawings);

function drawBackground() {
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, size_width, size_height)
}
drawBackground();

for (i=0; i<drawingsJSON.length; i++){
  playOnCanvas(drawingsJSON[i],i);
}


function getWidthFromPressure(pressure) {
  let p = pressure * 1000;
  return 8 - 0.25 * (p / 50);
}


function changeSpeed() {
    //Speed might be 2000 - 100,000
    console.log("hi");
    let speed = 5;
    let pointCount = Object.keys(drawings).length;
    clearInterval(interval);
    interval = setInterval(playCanvas, (11 - speed) * 2 - 1);
}

function playOnCanvas(point,location) {
  if(point == "up" || point == "down") {
    if(point == "up") {
      up = true;
    }
    return;
  }


  let _x = point.ev.clientX + point.ev.offsetX;
  let _y = point.ev.clientY + point.ev.offsetY-64;

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

  ctx.lineWidth = getWidthFromPressure(point.ev.pressure) - 1;
  ctx.beginPath();
  ctx.moveTo(prevX/2, prevY/2);
  ctx.lineTo(_x/2, _y/2);
  ctx.stroke();

  prevX = _x, prevY = _y;

  if(location%20==0)
  {
    encoder.addFrame(ctx)
    console.log("location");
    console.log(location)
  }


  if(location==2600)
  {
    encoder.finish()
    const buffer = encoder.out.getData()
    writeFile(path.join(__dirname, 'output', 'beginner.gif'), buffer, error =>
      {
        // gif drawn or error
      })
    }

}
