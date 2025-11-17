/**
 * Pen.js - Pressure-Sensitive Drawing Library
 *
 * Converts raw pointer events (mouse, touch, stylus) into pressure-sensitive
 * strokes with variable line width. Captures complete stroke data for AI training.
 *
 * Global variables (TODO: refactor to modules):
 * - pointerArray: Array of all captured stroke points
 * - ev: Current pointer event data
 */

var pointerArray = new Array();
var ev={};
'use strict'
	var Pen = (function() {
  var pen = {
    colors: {
      fg: '#555',
      bg: '#FFF'
    },
    lineWidth: 4,
    type: 'mouse',
    lineJoin: 'round',
    funcType: null,
    funcTypes: {
      draw: 'draw',
      erase: 'draw erase',
      menu: 'menu'
    },
    init: function init(context) {
      context.lineJoin = this.lineJoin;
      context.lineWidth = this.lineWidth;
      context.strokeStyle = this.color;
    },
    set: function set(context, config) {
      context.lineWidth = config.lineWidth;
      context.strokeStyle = config.color;
      context.lineJoin = this.lineJoin;
    },
    setFuncType: function setFuncType(pointerEvent) {
      if      (checkMenuKey(pointerEvent)) this.funcType = this.funcTypes.menu;
      else if (checkEraseKeys(pointerEvent)) this.funcType = this.funcTypes.erase;
      else this.funcType = this.funcTypes.draw;
      return this.funcType;
    },
    setPen: function setPen(context, pointerEvent) {
      switch(this.funcType) {
        case this.funcTypes.erase: {
          this.set(context, {
            color: this.colors.bg,
            lineWidth: 25
          });
          break;
        }
        case this.funcTypes.draw: {
          this.set(context, {
            color: this.colors.fg,
            lineWidth: getLineWidth(pointerEvent)
          });
          break;
        }
      }
    },
    release: function release() {
      this.funcType = null;
    }
  }

  /**
   * Calculate line width based on pointer input device and pressure
   * This is the "secret sauce" that makes strokes look natural!
   *
   * @param {PointerEvent} e - Raw pointer event
   * @returns {number} Line width in pixels
   */
  var getLineWidth = function getLineWidth(e) {
    //console.log(e);
	    // Capture complete stroke data for AI training (20+ attributes)
	    ev = {
		x: e.x,
		y: e.y,
        clientX: e.clientX,
        clientY: e.clientY,
        pressure: e.pressure,
		tangentialPressure: e.tangentialPressure,
        movementX: e.movementX,
        movementY: e.movementY,
        tiltX: e.tiltX,
        tiltY: e.tiltY,
        twist: e.twist,
        altitudeAngle: e.altitudeAngle,
		azimuthAngle: e.azimuthAngle,
		offsetX: e.offsetX,
		offsetY: e.offsetY,
		pageX: e.pageX,
		pageY: e.pageY,
		height: e.height,
		width: e.width,
		timeStamp: e.timeStamp
		
      }
  	pointerArray.push(ev);
    //console.log("    console.log(pointerArray); ");
    //console.log(pointerArray);

    // Map device type to line width formula
    // Different devices report pressure differently!
    switch (e.pointerType) {
      case 'touch': {
        // Touch devices report contact area (width/height), not pressure
        if (e.width < 10 && e.height < 10) {
          // Small touches = stylus tips (Apple Pencil, S-Pen)
          return (e.width + e.height) * 2 + 1;
        } else {
          // Large touches = fingers
          return (e.width + e.height - 40) / 5;
        }
      }
      case 'pen':
        // True stylus with pressure sensor (0.0 - 1.0)
        return e.pressure * 8;
      default:
        // Mouse fallback (no pressure)
        return (e.pressure) ? e.pressure * 8 : 4;
    }
  }

  var checkEraseKeys = function checkEraseKeys(e) {
    if (e.buttons === 32) return true;
    else if (e.buttons === 1 && e.shiftKey) return true;
    return false;
  }
  var checkMenuKey = function checkMenuKey(e) {
    return (e.buttons === 1 && e.ctrlKey);
  }

  function openMenu(e) {
    //console.log('Menu', e.pageX, e.pageY);
  }

  return pen;
})();
