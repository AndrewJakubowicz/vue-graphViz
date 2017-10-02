/**
 * Author: Andrew Jakubowicz
 *
 * Edge link tool.
 * Connects nodes together.
 */
var Rx = require('rxjs');
var d3 = require('d3');
var makeAbsoluteContext = require('../helpers/makeAbsoluteContext.js');

module.exports = function (graph, radialMenu, radialMenuGroupTool, currentState){


    var mousedown = Rx.Observable.fromEvent(radialMenuGroupTool, "mousedown"),
        mousemove = Rx.Observable.fromEvent(document, 'mousemove'),
        //mouseescape = Rx.Observable.fromEvent(graph.getSVGElement().node(), "mouseleave"),
        mouseUpOnNodeObservable = Rx.Observable.fromEvent(document, 'mouseup');

    var mousedrag = mousedown.flatMap(function (md) {
        md.preventDefault();
        console.log("started group drag");
        // Set current selection to the start dragged node.
        currentState.startedDragAt = currentState.currentNode.data.hash;
        var bbox = currentState.currentNode.selection.node().getBBox(),
            middleX = bbox.x + (bbox.width / 2),
            middleY = bbox.y + (bbox.height / 2);

        // generate a conversion function
        var convert = makeAbsoluteContext(currentState.currentNode.selection.node(), document.body);

        // use it to calculate the absolute center of the element with SVG canvas.
        var absoluteCenter = convert(middleX, middleY);

        // Transform the document position back into an SVG position.
        var svg = graph.getSVGElement().node();
        var _pt = svg.createSVGPoint();
        _pt.x = absoluteCenter.x; _pt.y = absoluteCenter.y;
        _pt = _pt.matrixTransform(svg.getScreenCTM().inverse());

        // Reference: http://stackoverflow.com/a/10298843/6421793
        return mousemove.map(function (mm) {
            mm.preventDefault();
            var pt = svg.createSVGPoint();

            function cursorPoint(evt){
                pt.x = evt.clientX; pt.y = evt.clientY;
                return pt.matrixTransform(svg.getScreenCTM().inverse());
            }
            return cursorPoint(mm)
        }).takeUntil(mouseUpOnNodeObservable)
            .finally(() => {
                // This is called when the sequence "completes".
                // Here we make the arrow disappear by moving it to the corner.

                // Merge the nodes.
                if (currentState.currentNode.mouseOverNode && currentState.startedDragAt !== currentState.currentNode.data.hash){
                    graph.mergeNodeToGroup(currentState.currentNode.data.hash, currentState.startedDragAt)
                }
            })
    });

    var sub = mousedrag.subscribe(function (d) {
        radialMenu.style.display = "none";
    },
    function (error) {
        console.log("ERROR", error)
    },
    function () {
        // Finished!
    });

}
