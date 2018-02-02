/*eslint-disable */
/**
 * Text edit utility.
 * Deals with the text edit capability of the note nodes.
 */
const Rx = require('rxjs');

/**
 * Takes an action observable.
 */
export default ($action) => {
  $action
    .filter(action => {
      return action.type === 'EDITNODE';
    }).map(action => {
      let fullRestart = action.restart;
      let restart = () => action.restart("NOUPDATE");
      let node = action.clickedNode;
      let deleteRadial = action.deleteRadial;
      let oldText = node.shortname;
      let callback = action.callback;
      text.clearText()
      deleteRadial()
      restart();

      // correct behaviour on paste
      Rx.Observable.fromEvent(elem, "paste")
        .do(e => {
          e.preventDefault();
          document.execCommand("insertText", false,e.clipboardData.getData('text/plain'));
        }).subscribe(restart);

      // Exit on "esc" keypress
      let $esc = Rx.Observable.concat(
        Rx.Observable.fromEvent(document, "keyup")
          .filter(e => e.keyCode == 27)
      );
      // Exit on mouseclick
      let $mouseClick = Rx.Observable.concat(
        Rx.Observable.fromEvent(document, "click")
      );
      // Exit on focus lost
      let blur = Rx.Observable.fromEvent(elem, "blur");

      // on exit
      let $exit = Rx.Observable.merge(
        $esc,
        $mouseClick,
        blur,
      ).do(() => {
        // remove selection
        if (window.getSelection) {
          window.getSelection().removeAllRanges();
        } else if (document.selection) {
          document.selection.empty()
        }
        //remove focus
        document.activeElement.blur();

        elem.classList.remove("allowSelection");
      });


      // Letters
      let $letters = Rx.Observable.fromEvent(document, "keyup");
      // .filter(e => e.keyCode !== 8 && e.keyCode !== 13)
      // .do((e) => {
      //   // if ((e.keyCode || e.which) === 32) {
      //   //   e.preventDefault();
      //   // }
      //   // let event = e || window.event;
      //   // let char = String.fromCharCode(e.keyCode || e.which)
      //   // text.addLetter(char);
      // })
      // .do(restart);

      // Return the typing observables merged together.
      let $typingControls = Rx.Observable.merge(
        $letters,
        $newLine,
        $interval
      )
        .do(_ => {
          node.shortname = text.getWithCursor();
          restart();
        })
        .takeUntil($mouseClick)
        .takeUntil($exit)
        .finally(_ => {
          node.shortname = text.getText();
          if (!node.shortname || node.shortname === '' ||
            node.shortname.length === 0 || node.shortname[0] === '' || node.shortname === oldText) {
            node.shortname = oldText;
            fullRestart();
          } else {
            callback(oldText, node.shortname)
          }

        })

      return $typingControls
    }
  )
    .switch()
    .subscribe(
      console.log,
      console.error,
      () => console.log("FINISH")
    )
}
