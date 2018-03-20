/*eslint-disable */
/**
 * Text edit utility.
 * Deals with the text edit capability of the note nodes.
 */
const Rx = require('rxjs');
const MediumEditor = require('medium-editor');
require('medium-editor/dist/css/medium-editor.css');
require('medium-editor/dist/css/themes/beagle.css');

/**
 * Takes an action observable.
 */
export default ($action, startCallback, endCallback) => {
  $action
    .filter(action => (action.type === 'EDITNODE' || action.type === 'EDITEDGE'))
    .map((action) => {
      startCallback && startCallback();
      const fullRestart = action.restart;
      const restart = () => action.restart('NOUPDATE');
      const save = action.save;
      const textElem = action.textElem;
      const clickedElem = action.clickedElem;
      let oldText;
      let defaultText;
      if (action.type === 'EDITNODE') {
        oldText = action.clickedNode.shortname;
        defaultText = 'New';
        textElem.style.pointerEvents = 'visiblePainted'; // allow mouse interaction with node text
      }
      if (action.type === 'EDITEDGE') {
        defaultText = '';
        oldText = action.edge.predicate.text ? action.edge.predicate.text : defaultText;
      }

      // allow selection of text
      textElem.classList.add('allowSelection');

      // start rich text editor
      const mediumEditorConfig = {
        buttonLabels: 'fontawesome',
        disableDoubleReturn: true,
        toolbar: {
          buttons: ['bold', 'italic', 'underline'],
          diffTop: 0,
        },
        paste: {
          forcePlainText: false,
          cleanPastedHTML: false,
        },
        placeholder: false,
      };
      const editor = new MediumEditor(textElem, mediumEditorConfig);

      // select text if New else move caret to end
      if (window.getSelection) {
        const range = document.createRange();
        range.selectNodeContents(textElem);
        if (textElem.innerHTML !== defaultText) {
          range.collapse(false);
        }
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } else if (document.body.createTextRange) { // IE compatability
        const textRange = document.body.createTextRange();
        textRange.moveToElementText(textElem);
        if (textElem.innerHTML !== defaultText) {
          textRange.collapse(false);
        }
        textRange.select();
      }

      textElem.focus(); // focus on text box
      restart();

      // Input handling
      const $input = Rx.Observable.fromEventPattern(
        handler => editor.subscribe('editableInput', handler),
        handler => editor.unsubscribe('editableInput', handler),
      );
      // correct behaviour on paste
      const $paste = Rx.Observable.fromEvent(textElem, 'paste')
        .do((e) => {
          e.preventDefault();
          const HTMLText = e.clipboardData.getData('text/html').replace(/[\n\r]+/g, '\n');
          const plaintext = e.clipboardData.getData('text/plain');
          editor.cleanPaste(HTMLText || plaintext);
        });

      // Exit Handling
      // On "esc" keypress cancel changes
      const $esc = Rx.Observable.concat(
        Rx.Observable.fromEvent(document, 'keyup')
          .filter(e => e.keyCode === 27)
          .do(() => {
            textElem.innerHTML = oldText;
          }));
      // On mouseclick
      const $mouseClick = Rx.Observable.concat(
        Rx.Observable.fromEvent(document, 'click')
          .filter(e => e.target !== textElem)
          .map(e => ({ e, descendants: Array.from(textElem.querySelectorAll('*')) }))
          .filter(({ e, descendants }) => !descendants.includes(e.target)));
      // Exit on focus lost
      const $editorBlur = Rx.Observable.fromEventPattern(
        handler => editor.subscribe('blur', handler),
        handler => editor.unsubscribe('blur', handler),
      );
      const $windowBlur = Rx.Observable.fromEvent(window, 'blur');
      // on exit
      const $exit = Rx.Observable.merge(
        $esc,
        $mouseClick,
        $windowBlur,
        $editorBlur,
      ).do(() => {
        // remove selection
        if (window.getSelection) {
          window.getSelection().removeAllRanges();
        } else if (document.selection) {
          document.selection.empty();
        }
        // remove focus
        document.activeElement.blur();
        // remove text selection
        textElem.classList.remove('allowSelection');
        if (action.type === 'EDITNODE') {
          textElem.style.pointerEvents = 'none';
        }
      });

      // Return the typing observable.
      const $typingControls = Rx.Observable
        .merge($paste, $input)
        .do(restart)
        .takeUntil($exit)
        .finally(() => {
          editor.destroy();
          if (!textElem.innerHTML || textElem.innerHTML === '' ||
            textElem.innerHTML.length === 0 || textElem.innerHTML === oldText) {
            textElem.innerHTML = oldText;
            fullRestart();
          } else {
            save && save(textElem.innerHTML);
          }
          endCallback && endCallback();
        });
      return $typingControls;
    })
    .switch()
    .subscribe(
      () => undefined,
      console.error,
      () => console.log('FINISH'),
    );
};
