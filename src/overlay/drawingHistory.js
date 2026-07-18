export function createDrawingHistory() {
  let strokes = [];
  let redoStrokes = [];

  return {
    commit(stroke) {
      strokes.push(stroke);
      redoStrokes = [];
      return true;
    },

    undo() {
      if (strokes.length === 0) return false;
      redoStrokes.push(strokes.pop());
      return true;
    },

    redo() {
      if (redoStrokes.length === 0) return false;
      strokes.push(redoStrokes.pop());
      return true;
    },

    clear() {
      strokes = [];
      redoStrokes = [];
    },

    getStrokes() {
      return strokes;
    },
  };
}
