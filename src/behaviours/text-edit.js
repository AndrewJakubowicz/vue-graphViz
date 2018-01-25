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
      let elem = action.elem;
      let callback = action.callback;

      // block undo in graphviz usingkeyboard shortcut
      action.canUndo(false);
      // remove hover menu
      deleteRadial();

      elem.classList.add("allowSelection");

      // select text if New else move caret to end
      if (window.getSelection) {
        let range = document.createRange();
        range.selectNodeContents(elem);
        if (elem.innerHTML !== "New") {
          range.collapse(false);
        }
        let sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else if (document.body.createTextRange) { // IE compatability
        let textRange = document.body.createTextRange();
        textRange.moveToElementText(elem);
        if (elem.innerHTML !== "New") {
          textRange.collapse(false);
        }
        textRange.select();
      }

      elem.focus(); // focus on text box
      // elem.innerText = elem.innerHTML.replace(/<br>/g, "\n").replace(/&nbsp;/g, " "); // display HTML content of node //TODO-ya determine how interaction will work
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
      ).do(() => {
        restart()
      }).takeUntil($exit)
        .finally(() => {
          action.canUndo(true);
          // elem.innerText = elem.innerText.trim().replace(/\n/g, "<br>");
          // elem.innerText = elem.innerHTML;
          if (!elem.innerText || elem.innerText === '' || elem.innerText.length === 0 ||
            elem.innerText[0] === '' || elem.innerText === oldText) {
            elem.innerText = oldText;
            fullRestart();
          } else {
            callback(elem.innerText)
          }
        });
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
