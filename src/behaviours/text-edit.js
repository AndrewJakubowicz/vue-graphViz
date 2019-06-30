/*eslint-disable */
/**
 * Text edit utility.
 * Deals with the text edit capability of the note nodes.
 */
import { fromEvent, fromEventPattern, concat, merge } from 'rxjs';
import {
  map,
  filter,
  tap,
  finalize,
  take,
  takeUntil,
  switchAll,
} from 'rxjs/operators';

const MediumEditor = require('medium-editor');
require('medium-editor/dist/css/medium-editor.css');
require('medium-editor/dist/css/themes/beagle.css');

const mediumEditorConfig = {
  disableDoubleReturn: true,
  toolbar: {
    buttons: ['bold', 'italic', 'underline', 'justifyLeft', 'justifyCenter'],
    diffTop: 0,
  },
  paste: {
    forcePlainText: false,
    cleanPastedHTML: false,
  },
  placeholder: false,
};

/**
 * Takes an action observable.
 */
export default ($action, startCallback, endCallback) => {
  $action.pipe(
    filter(action => (action.type === 'EDITNODE' || action.type === 'EDITEDGE' || action.type === 'EDITGROUP')),
    map((action) => {
      startCallback && startCallback();
      const fullRestart = action.restart;
      const restart = () => action.restart(undefined, true);
      const save = action.save;
      const textElem = action.textElem;
      const defaultText = 'New';
      let unedited = true;

      // get initial text
      let oldText;
      if (action.type === 'EDITNODE') {
        oldText = action.d.shortname ? action.d.shortname : defaultText;
      }
      if (action.type === 'EDITEDGE') {
        oldText = action.d.predicate.text ? action.d.predicate.text : '';
        if (oldText === '') {
          textElem.innerHTML = 'New';
          // manually reposition text so that mediumeditor menu appears in correct position
          const fOParent = textElem.parentElement.parentElement;
          fOParent.setAttribute('x', fOParent.getAttribute('x') - textElem.offsetWidth / 2);
          fOParent.setAttribute('y', fOParent.getAttribute('y') - textElem.offsetHeight / 2);
        }
      }
      if (action.type === 'EDITGROUP') {
        oldText = action.d.data.text || '';
        if (oldText === '') {
          textElem.innerHTML = 'New';
        }
      }

      // allow mouse interaction with node text
      textElem.style.pointerEvents = 'visiblePainted';
      // allow selection of text
      textElem.classList.add('allowSelection');

      // start rich text editor
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
      const $input = fromEventPattern(
        handler => editor.subscribe('editableInput', handler),
        handler => editor.unsubscribe('editableInput', handler),
      );
      // correct behaviour on paste
      const $paste = fromEvent(textElem, 'paste').pipe(
        tap((e) => {
          e.preventDefault();
          const HTMLText = e.clipboardData.getData('text/html').replace(/[\n\r]+/g, '\n');
          const plaintext = e.clipboardData.getData('text/plain');
          editor.cleanPaste(HTMLText || plaintext);
        }),
      );

      // Exit Handling
      // On "esc" keypress cancel changes
      const $esc = concat(
        fromEvent(document, 'keyup').pipe(
          filter(e => e.keyCode === 27),
          tap(() => {
            textElem.innerHTML = oldText;
          }),
        ));
      // On mouseclick
      const $mouseClick = concat(
        fromEvent(document, 'click').pipe(
          filter(e => e.target !== textElem),
          map(e => ({ e, descendants: Array.from(textElem.querySelectorAll('*')) })),
          filter(({ e, descendants }) => !descendants.includes(e.target)),
        ));
      // Exit on focus lost
      const $editorBlur = fromEventPattern(
        handler => editor.subscribe('blur', handler),
        handler => editor.unsubscribe('blur', handler),
      );
      const $windowBlur = fromEvent(window, 'blur');
      // on exit
      const $exit = merge(
        $esc,
        $mouseClick,
        $windowBlur,
        $editorBlur,
      ).pipe(tap(() => {
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
        // remove pointer events
        textElem.style.pointerEvents = 'none';
      }));

      // watch to see if text gets edited.
      $input.pipe(
        takeUntil($exit),
        take(1),
      ).subscribe(() => {
        unedited = false;
      });

      // Return the typing observable.
      return merge($paste, $input).pipe(
        tap(restart),
        takeUntil($exit),
        finalize(() => {
          editor.destroy();
          textElem.innerHTML = textElem.innerHTML.trim();
          // if blank line reset to blank text.
          if (textElem.innerHTML === '<br>') {
            textElem.innerHTML = '';
          }
          // if text is unedited, reset edge text to blank for groups and edges
          if ((action.type === 'EDITEDGE' || action.type === 'EDITGROUP')
            && unedited && oldText === '') {
            textElem.innerHTML = '';
          }
          if (textElem.innerHTML === oldText) {
            fullRestart();
          } else {
            save && save(textElem.innerHTML.replace(/^<p>|<\/p>$/g, ''));
          }
          endCallback && endCallback();
        }),
      );
    }),
    switchAll(),
  ).subscribe(
    () => undefined,
    console.error,
    () => console.log('FINISH'),
  );
};
