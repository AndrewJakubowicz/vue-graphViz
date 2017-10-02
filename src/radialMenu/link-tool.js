/**
 * Author: Andrew Jakubowicz
 *
 * Edge link tool.
 * Connects nodes together.
 */
var Rx = require('rxjs');
var d3 = require('d3');
var makeAbsoluteContext = require('../helpers/makeAbsoluteContext.js');

module.exports = function (graph, radialMenu, radialMenuArrowTool, currentState){
    let tempDrawingArrow = {
        start: {x: 0, y:0},
        end: {x: 0, y:0}
    }

    /**
     * updateLine is called to update the users arrow.
     */
    function updateLine(){
        var line = graph.getSVGElement().selectAll("#menu-line-overlay")
            .data(d3Data)

        var lineEnter = line.enter().append('line')
            .attr("id", "menu-line-overlay")

        line = line.merge(lineEnter);

        line.attr("x1", d => d.start.x)
            .attr("y1", d => d.start.y)
            .attr("x2", d => d.end.x)
            .attr("y2", d => d.end.y)
            .attr("stroke-width", 1)
            .attr("stroke", "grey")
            .attr("pointer-events", "none");
    }

    let d3Data = [tempDrawingArrow];

    var mousedown = Rx.Observable.fromEvent(radialMenuArrowTool, "mousedown"),
        mousemove = Rx.Observable.fromEvent(document, 'mousemove'),
        //mouseescape = Rx.Observable.fromEvent(graph.getSVGElement().node(), "mouseleave"),
        mouseUpOnNodeObservable = Rx.Observable.fromEvent(document, 'mouseup');

    var mousedrag = mousedown.flatMap(function (md) {
        md.preventDefault();
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

        tempDrawingArrow.start = {x: _pt.x, y: _pt.y};

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
                // We also add the triplet.
                tempDrawingArrow.end = {x: 0, y:0};
                tempDrawingArrow.start = {x:0,y:0};
                updateLine();

                // Create the triplet
                if (currentState.currentNode.mouseOverNode && currentState.startedDragAt !== currentState.currentNode.data.hash){
                    graph.addTriplet({subject: currentState.nodeMap.get(String(currentState.startedDragAt)),
                        predicate: {type: document.getElementById('type-input').value || " "},
                        object: currentState.nodeMap.get(String(currentState.currentNode.data.hash))
                    });
                }
            })
    });

    var sub = mousedrag.subscribe(function (d) {
        radialMenu.style.display = "none";
        tempDrawingArrow.end = {x: d.x, y: d.y};

        updateLine();
    },
    function (error) {
        console.log("ERROR", error)
    },
    function () {
        // FINISHED CODE
        tempDrawingArrow.end = {x: 0, y:0};
        tempDrawingArrow.start = {x:0,y:0};
        updateLine();
    });

}
