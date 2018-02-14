/*eslint-disable */
/**
 * Text edit utility.
 * Deals with the text edit capability of the note nodes.
 */
const Rx = require('rxjs');

/**
 * Takes an action observable.
 */
export default ($action, startCallback, endCallback) => {
  $action
    .filter(action => {
      return (action.type === 'EDITNODE' || action.type === "EDITEDGE");
    }).map(action => {
      startCallback && startCallback();
      let fullRestart = action.restart;
      let restart = () => action.restart("NOUPDATE");

      let save = action.save;
      let textElem = action.textElem;
      let clickElem = action.clickElem;
      let oldText, defaultText;
      if (action.type === "EDITNODE") {
        oldText = action.clickedNode.shortname;
        defaultText = "New";
      }
      if (action.type === "EDITEDGE") {
        defaultText = "";
        oldText = action.edge.predicate.text ? action.edge.predicate.text : defaultText;
      }

      // allow selection of text
      textElem.classList.add("allowSelection");

      // select text if New else move caret to end
      if (window.getSelection) {
        let range = document.createRange();
        range.selectNodeContents(textElem);
        if (textElem.innerHTML !== defaultText) {
          range.collapse(false);
        }
        let sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else if (document.body.createTextRange) { // IE compatability
        let textRange = document.body.createTextRange();
        textRange.moveToElementText(textElem);
        if (textElem.innerHTML !== defaultText) {
          textRange.collapse(false);
        }
        textRange.select();
      }

      textElem.focus(); // focus on text box
      // textElem.innerText = textElem.innerHTML.replace(/<br>/g, "\n").replace(/&nbsp;/g, " "); // display HTML content of node //TODO-ya determine how interaction will work
      restart();

      // correct behaviour on paste
      Rx.Observable.fromEvent(textElem, "paste")
        .do(e => {
          e.preventDefault();
          document.execCommand("insertText", false, e.clipboardData.getData('text/plain'));
        }).subscribe(restart);

      // Exit on "esc" keypress
      let $esc = Rx.Observable.concat(
        Rx.Observable.fromEvent(document, "keyup")
          .filter(e => e.keyCode == 27)
      );
      // Exit on mouseclick
      let $mouseClick = Rx.Observable.concat(
        Rx.Observable.fromEvent(document, "click")
          .filter(e => action.type === "EDITEDGE" && e.target !== textElem)
      );
      // Exit on focus lost
      let blur = Rx.Observable.fromEvent(textElem, "blur");
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
          document.selection.empty();
        }
        //remove focus
        document.activeElement.blur();
        // remove text selection
        textElem.classList.remove("allowSelection");
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
        restart();
      }).takeUntil($exit)
        .finally(() => {
          // textElem.innerText = textElem.innerText.trim().replace(/\n/g, "<br>");
          // textElem.innerText = textElem.innerHTML;
          if (!textElem.innerText || textElem.innerText === '' || textElem.innerText.length === 0 ||
            textElem.innerText[0] === '' || textElem.innerText === oldText) {
            textElem.innerText = oldText;
            fullRestart();
          } else {
            save && save(textElem.innerText);
          }
          endCallback && endCallback();
        });
      return $typingControls;
    }
  )
    .switch()
    .subscribe(
      () => {
      },
      // console.log,
      console.error,
      () => console.log("FINISH")
    );
}
