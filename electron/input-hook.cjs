function toDisplayPoint(event, display) {
  return {
    x: Math.round(event.x / display.scaleFactor) - display.bounds.x,
    y: Math.round(event.y / display.scaleFactor) - display.bounds.y,
  };
}

function createInputHook({ uiohook, getPrimaryDisplay, send }) {
  let started = false;

  const sendMouse = (type) => (event) => {
    const point = toDisplayPoint(event, getPrimaryDisplay());
    send(channels.GLOBAL_MOUSE, {
      type,
      ...(type === 'move' ? {} : { button: event.button }),
      ...point,
    });
  };

  return {
    start() {
      if (started) return;
      uiohook.on('mousemove', sendMouse('move'));
      uiohook.on('mousedown', sendMouse('down'));
      uiohook.on('mouseup', sendMouse('up'));
      uiohook.on('keydown', (event) => send(channels.GLOBAL_KEY, {
        type: 'down',
        keycode: event.keycode,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
      }));
      uiohook.on('keyup', (event) => send(channels.GLOBAL_KEY, {
        type: 'up',
        keycode: event.keycode,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        shiftKey: event.shiftKey,
        metaKey: event.metaKey,
      }));
      uiohook.on('wheel', (event) => send(channels.GLOBAL_WHEEL, {
        rotation: event.rotation,
        amount: event.amount,
        direction: event.direction,
      }));
      uiohook.start();
      started = true;
    },

    stop() {
      if (!started) return;
      uiohook.stop();
      started = false;
    },
  };
}

module.exports = { createInputHook, toDisplayPoint };
const channels = require('./ipc-channels.cjs');
