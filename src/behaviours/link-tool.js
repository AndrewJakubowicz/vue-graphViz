/*eslint-disable */
/**
 * Author: Andrew Jakubowicz
 *
 * Edge link tool.
 * Connects nodes together.
 */
// import uuid from 'uuid'
const Rx = require('rxjs');
// const d3 = require('d3');
const uuid = require('uuid');

const makeAbsoluteContext = (element, documentNode) => {
  return function (x, y) {
    const offset = documentNode.getBoundingClientRect();
    const matrix = element.getScreenCTM();
    return {
      x: (matrix.a * x) + (matrix.c * y) + matrix.e - offset.left,
      y: (matrix.b * x) + (matrix.d * y) + matrix.f - offset.top
    };
  };
};

module.exports = function (graph, mousedown, $lastNode, toNode, saveEdge, finishDrag) {
  return (nodesList) => {
    let tempDrawingArrow = {
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 }
    };
    let currentState = {};

    /**
     * updateLine is called to update the users arrow.
     */
    function updateLine() {
      let line = graph.getSVGElement().selectAll('#menu-line-overlay')
        .data(d3Data);

      const lineEnter = line.enter().append('line')
        .attr('id', 'menu-line-overlay');

      line = line.merge(lineEnter);

      line.attr('x1', d => d.start.x)
        .attr('y1', d => d.start.y)
        .attr('x2', d => d.end.x)
        .attr('y2', d => d.end.y)
        .attr('stroke-width', 1)
        .attr('stroke', 'grey')
        .attr('pointer-events', 'none');
    }

    let d3Data = [tempDrawingArrow];

    const mousemove = Rx.Observable.fromEvent(document, 'mousemove'),
      mouseUpOnNodeObservable = Rx.Observable.fromEvent(document, 'mouseup');

    // Mousedown subscription with handlers.
    const mousedrag = mousedown
      .filter(action => {
        return action.type === 'CREATEEDGE';
      })
      .flatMap(function (obj) {
        // Set current selection to the start dragged node.
        currentState.startedDragAt = obj.clickedNode.hash;
        const bbox = obj.selection.node().getBBox(),
          middleX = bbox.x + (bbox.width / 2),
          middleY = bbox.y + (bbox.height / 2);

        // generate a conversion function
        const convert = makeAbsoluteContext(obj.selection.node(), document.body);

        // use it to calculate the absolute center of the element with SVG canvas.
        const absoluteCenter = convert(middleX, middleY);

        // Transform the document position back into an SVG position.
        const svg = graph.getSVGElement().node();
        let _pt = svg.createSVGPoint();

        _pt.x = absoluteCenter.x;
        _pt.y = absoluteCenter.y;

        _pt = _pt.matrixTransform(svg.getScreenCTM().inverse());

        tempDrawingArrow.start = { x: _pt.x, y: _pt.y };

        // Reference: http://stackoverflow.com/a/10298843/6421793
        return mousemove.map(function (mm) {
          mm.preventDefault();
          const pt = svg.createSVGPoint();

          function cursorPoint(evt) {
            pt.x = evt.clientX;
            pt.y = evt.clientY;
            return pt.matrixTransform(svg.getScreenCTM().inverse());
          }


          return cursorPoint(mm);
        }).takeUntil(mouseUpOnNodeObservable)
          .finally(() => {
            // This is called when the sequence "completes".
            // Here we make the arrow disappear by moving it to the corner.
            // We also add the triplet.

            tempDrawingArrow.end = { x: 0, y: 0 };
            tempDrawingArrow.start = { x: 0, y: 0 };
            updateLine();

            // Create the triplet
            if (currentState.currentNode.mouseOverNode && currentState.startedDragAt
              !== currentState.currentNode.hash) {
              saveEdge({
                subject: toNode(nodesList.filter(d => `${d.id || d.hash}` === currentState.startedDragAt)[0]),
                predicate: {
                  type: 'arrow',
                  text: '',
                  hash: 'edge-' + uuid.v4(),
                  subject: currentState.startedDragAt,
                  object: currentState.currentNode.hash
                },
                object: toNode(nodesList.filter(d => `${d.id || d.hash}` === currentState.currentNode.hash)[0]),
              });
            }
            finishDrag();
          });
      });

    const sub = mousedrag.subscribe(function (d) {
        tempDrawingArrow.end = { x: d.x, y: d.y };
        updateLine();
      },
      function (error) {
        console.log('ERROR', error);
      },
      function () {
        // FINISHED CODE
        tempDrawingArrow.end = { x: 0, y: 0 };
        tempDrawingArrow.start = { x: 0, y: 0 };

        updateLine();
      });

    const currentNodeSub = $lastNode.subscribe(function (node) {
      currentState.currentNode = node;
    });

    // Return the subscribed observables so it's possible to unsubscribe
    // when modifying the function.
    return () => {
      sub.unsubscribe();
      currentNodeSub.unsubscribe();
    };
  };
};
