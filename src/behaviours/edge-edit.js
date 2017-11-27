/*eslint-disable */
/**
 * Edge text edit utility.
 * Deals with the text edit capability of the edges.
 */
const Rx = require('rxjs');

// Modal of the text
function Text(startingText) {
  let text = [],
    cursor = true;
  if (!Array.isArray(startingText)) {
    text.push(startingText);
  } else {
    // Make a copy of the array
    text = JSON.parse(JSON.stringify(startingText));
  }
  return {
    addLetter: (char) => {
      let lastLine = text.slice(-1);
      lastLine += char;
      text[text.length - 1] = lastLine;
    },

    newLine: () => {
      if (text[text.length - 1] === "") {
        return;
      }
      text.push("");
    },

    deleteText: () => {
      /**
       * Delete a single character of text.
       * Delete a line if it is empty.
       */
      if (text.length > 1) {
        if (text[text.length - 1] === '') {
          text = text.slice(0, -1);
        } else {
          text[text.length - 1] = text[text.length - 1].slice(0, -1);
        }
      } else {
        if (text[0] === "") {
          return;
        }
        text[0] = text[0].slice(0, -1);
      }
    },

    clearText: () => {
      if (!text[0]) {
        text[0] = '';
      }
    },

    toggleCursor: () => {
      cursor = !cursor;
    },

    getWithCursor: () => {
      let t = JSON.parse(JSON.stringify(text));
      if (cursor) {
        return t;
      } else {
        t[t.length - 1] += '|';
        return t
      }
    },

    getText: () => {
      return JSON.parse(JSON.stringify(text));
    }

  }
}

/**
 * Takes an action observable.
 */
export default ($action) => {
  $action
    .filter(action => {
      return action.type === 'EDITEDGE';
    })
    .map(action => {
      let edge = action.edge;
      let text = Text(edge.edgeData.text);
      let update = () => {
        action.update(text.getText());
        action.restart();
      };
      let save = () => {
        action.save(text.getText());
        action.restart()
      };
      text.clearText(); // needed here if text is null.

      // Exit on "esc" keypress
      let $exit = Rx.Observable.concat(
        Rx.Observable.fromEvent(document, "keyup")
          .filter(e => e.keyCode == 27)
      );

      let $mouseClick = Rx.Observable.concat(
        Rx.Observable.fromEvent(document, "click")
      );

      // Backspace
      let $backspace = Rx.Observable.fromEvent(document, "keydown")
        .filter(e => e.keyCode === 8 && e.keyCode !== 13)
        .do(_ => text.deleteText())
        .do(update);

      // Letters
      let $letters = Rx.Observable.fromEvent(document, "keypress")
        .filter(e => e.keyCode !== 8 && e.keyCode !== 13)
        .do((e) => {
          if ((e.keyCode || e.which) === 32) {
            e.preventDefault();
          }
          let event = e || window.event;
          let char = String.fromCharCode(e.keyCode || e.which);
          text.addLetter(char);
        })
        .do(update);

      let $newLine = Rx.Observable.fromEvent(document, "keypress")
        .filter(e => e.keyCode === 13)
        .do(e => {
          // Prevent stacking newlines. (Not supported) //TODO why?
          if (edge.edgeData.text.slice(-1) === "") {
            return;
          }
          text.newLine();
        })
        .do(update);

      let $interval = Rx.Observable
        .interval(500 /* ms */)
        .timeInterval()
        .do(() => {
          text.toggleCursor();
        });

      // Return the typing observables merged together.
      let $typingControls = Rx.Observable.merge(
        $backspace,
        $letters,
        $newLine,
        $interval
      )
        .do(() => {
          action.update(text.getWithCursor());
          action.restart();
        })
        .takeUntil($mouseClick)
        .takeUntil($exit)
        .finally(() => {
          edge.edgeData.text = text.getText();
          if (!edge.edgeData.text || edge.edgeData.text === '' ||
            edge.edgeData.text.length === 0 || edge.edgeData.text[0] === '') {
            edge.edgeData.text = ''
          }
          save();
        });
      return $typingControls
    })
    .switch()
    .subscribe(
      console.log,
      console.error,
      () => console.log("FINISH")
    )
}
