/*eslint-disable */
/**
 * Text edit utility.
 * Deals with the text edit capability of the note nodes.
 */
const Rx = require('rxjs');

// Modal of the text
function Text(startingText, node, restart) {
    let text = [],
        cursor = true;
    if (!Array.isArray(startingText)){
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
            if (text.length > 1){
                if (text[text.length - 1] === ''){
                    text = text.slice(0, -1)
                    return;
                } else {
                    text[text.length - 1] = text[text.length - 1].slice(0, -1)
                    return;
                }
            } else {
                if (text[0] === ""){
                    return;
                }
                text[0] = text[0].slice(0, -1);
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
        return action.type === 'EDITNODE';
      })
      .map(action => {
        let restart = action.restart;
        let node = action.clickedNode;
        let text = Text(node.shortname, node, restart);
        let previousColor = node.color;
        node.color = "white";
        restart();
        // Exit on "esc" keypress
        let $exit = Rx.Observable.concat(
            Rx.Observable.fromEvent(document, "keyup")
                    .filter(e => e.keyCode == 27)
        );

        // Backspace
        let $backspace = Rx.Observable.fromEvent(document, "keydown")
            .filter(e => e.keyCode === 8 && e.keyCode !== 13)
            .do(_ => text.deleteText());
        
        // Letters
        let $letters = Rx.Observable.fromEvent(document, "keypress")
            .filter(e => e.keyCode !== 8 && e.keyCode !== 13)
            .do((e) => {
                if ((e.keyCode || e.which) === 32){
                    e.preventDefault();
                }
                let event = e || window.event;
                let char = String.fromCharCode(e.keyCode || e.which)
                text.addLetter(char);
            });

        let $newLine = Rx.Observable.fromEvent(document, "keypress")
            .filter(e => e.keyCode === 13)
            .do(e => {
                // Prevent stacking newlines. (Not supported)
                if (node.shortname.slice(-1) === ""){
                    return;
                }
                text.newLine();
            })
        
        let $interval = Rx.Observable
            .interval(500 /* ms */)
            .timeInterval()
            .do(_ => {
                text.toggleCursor();
            })
        
        // Return the typing observables merged together.
        let $typingControls = Rx.Observable.merge(
                $backspace,
                $letters,
                $newLine,
                $interval
            )
            .do(_ => {
                node.shortname = text.getWithCursor();
                restart();
            })
            .takeUntil($exit)
            .finally(_ => {
                node.color = previousColor;
                node.shortname = text.getText();
                restart();
            })
        return $typingControls
    })
    .switch()
    .subscribe(
        console.log,
        console.error,
        () => console.log("FINISH")
    )
}


function deleteText(nodeText){
    /**
     * Delete a single character of text.
     * Delete a line if it is empty.
     */
    if (nodeText.length > 1){
        if (nodeText[nodeText.length - 1] === ''){
            node.shortname = nodeText.slice(0, -1)
            return;
        } else {
            nodeText[nodeText.length - 1] = nodeText[nodeText.length - 1].slice(0, -1)
            return;
        }
    } else {
        if (nodeText[0] === ""){
            return
        }
        nodeText[0] = nodeText[0].slice(0, -1)
    }
}

function addLetter(text, character){
    let lastLine = text.slice(-1);
    lastLine += character;
    text[text.length - 1] = lastLine;
}
