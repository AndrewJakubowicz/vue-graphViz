<template>
  <div id="graph-viz">
    <link v-once rel="stylesheet" href="./static/fonts/font-awesome/css/font-awesome.css"/>
    <!-- <link v-once rel="stylesheet" href="./static/style.css" /> -->

    <nodeList v-bind:nodesOutside='nodesOutsideDiagram' @clickedNodeInList="addNode($event)"/>
    <toolBar @clickedAction="changeMouseState($event)"/>

    <div id="graph" v-on:dblclick="dblClickOnPage"></div>

  </div>
</template>

<script>
  /**
   Event emitters:
   - mouseovernode, nodeId - String
   - mouseoutnode, void
   */
  import networkViz from 'networkvizjs';
  import nodeList from './components/nodeList';
  import toolBar from './components/toolBar';
  import linkTool from './behaviours/link-tool';
  import textEdit from './behaviours/text-edit';

  const Rx = require('rxjs');
  const DELETE = 'DELETE';
  const CREATEEDGE = 'CREATEEDGE';
  const POINTER = 'POINTER';
  const SAVE = 'SAVE';
  const ADDNOTE = 'ADDNOTE';
  const CLEARSCREEN = 'CLEARSCREEN';
  const REMOVEARROWS = 'REMOVEARROWS';
  const PIN = 'PIN';
  import uuid from 'uuid'

  export default {
    props: ['hypothesisId', 'nodes', 'highlightedNodeId', 'savedDiagram', 'width', 'height', 'textNodes'],
    name: 'graph-viz',
    components: {nodeList, toolBar},
    data() {
      return {
        graph: undefined,
        nodesOutsideDiagram: [],
        mouseState: POINTER,
        linkTool: undefined,
        linkToolDispose: undefined, // Subscription disposing.
        notes: 0,
        noteObjs: [],
      };
    },
    mounted() {

      this.createGraph(() => {
        // Create initial diagram from createDiagram.
        if (this.savedDiagram) {
          // Create from saved.
          const savedGraph = JSON.parse(this.savedDiagram);
          const nodes = savedGraph.nodes;

          nodes.forEach((v) => {
            // Append x and y co-ordinates to the nodes passed in.
            this.addNodeHelper(v.hash, v.x, v.y);
          });
          const triplets = savedGraph.triplets;
          triplets.forEach((x) => {
            // Create the triplets between the nodes.
            const indexOfSubject = this.textNodes.map(v => v && v.id).indexOf(x.subject);
            const indexOfObject = this.textNodes.map(v => v && v.id).indexOf(x.object);
            if (indexOfSubject === -1 || indexOfObject === -1) {
              return;
            }
            // Create the triplet
            this.graph.addTriplet({
              subject: this.toNode(this.textNodes[indexOfSubject]),
              object: this.toNode(this.textNodes[indexOfObject]),
              predicate: {type: 'arrow'},
            });
          });
        }
      });
    },
    watch: {
      width(current, old) {
        if (current !== old) {
          this.graph.canvasOptions.setWidth(current);
        }
      },
      height(current, old) {
        if (current !== old) {
          this.graph.canvasOptions.setHeight(current);
        }
      },
      textNodes(current, old) {
        // Remove any nodes that have been removed.
        const newIds = new Set(current.map(v => v.id));
        old.forEach((v) => {
          if (!newIds.has(v.id)) {
            this.graph.removeNode(`${v.id}`);
          }
        });
        // Nodes that are passed in but aren't drawn go in the list.
        this.recalculateNodesOutside();
      },
      savedDiagram(current, old) {
        if (current === old) {
          return;
        }
        this.clearScreen();
        // Create from saved.
        const savedGraph = JSON.parse(current);
        const nodes = savedGraph.nodes;
        nodes.forEach((v) => {
          // Append x and y co-ordinates to the nodes passed in.
          this.addNodeHelper(v.hash, v.x, v.y);
        });
        const triplets = savedGraph.triplets;
        triplets.forEach((x) => {
          // Create the triplets between the nodes.
          const indexOfSubject = this.textNodes.map(v => v && v.id).indexOf(x.subject);
          const indexOfObject = this.textNodes.map(v => v && v.id).indexOf(x.object);
          if (indexOfSubject === -1 || indexOfObject === -1) {
            return;
          }
          // Create the triplet
          this.graph.addTriplet({
            subject: this.toNode(this.textNodes[indexOfSubject]),
            object: this.toNode(this.textNodes[indexOfObject]),
            predicate: {type: 'arrow'},
          });
        });
      },
    },

    methods: {

      removeNode() {
        var node = this.currentNode;
        this.graph.removeNode(node.hash, this.recalculateNodesOutside);
      },

      clearScreen() {
        /**
         * Delete the graph and start a new one.
         * Removing nodes from: https://stackoverflow.com/a/3955238/6421793
         */
        const myNode = document.getElementById('graph');
        while (myNode.firstChild) {
          myNode.removeChild(myNode.firstChild);
        }
        this.createGraph();
        this.recalculateNodesOutside();
      },

      createGraph(callback) {
        const $mouseOverNode = new Rx.Subject();

        const currentState = {
          currentNode: {
            data: {},
            selection: {},
            mouseOverNode: false
          },
          startedDragAt: "",
          nodeMap: new Map()
        }
        this.$on('mouseovernode', function () {
          console.log("mouseovernode")
        })

        this.graph = networkViz('graph', {
          layoutType: 'jaccardLinkLengths',
          edgeLength: 140,
          jaccardModifier: 0.9,
          height: document.getElementById(this.$el.id).clientHeight,
          width: document.getElementById(this.$el.id).clientWidth,

          nodeToColor: function nodeToColor(d) {
            return d.color ? d.color : "white";
          },

          // Shapes defined: rect, circle, capsule
          nodeShape: (d) => {
            switch (d.nodeShape) {
              case 'rect': {
                return 'M16 48 L48 48 L48 16 L16 16 Z';
              }
              case 'circle': {
                return 'M20,40a20,20 0 1,0 40,0a20,20 0 1,0 -40,0';
              }
              case 'capsule': {
                const X = 37;
                const Y = -13;
                const p1x = 25 + X;
                const p1y = 25 + Y;
                const p2x = 75 + X;
                const p3x = 100 + X;
                const p4y = 50 + Y;
                return `M ${p1x} ${p1y} L ${p2x} ${p1y} C ${p3x} ${p1y} ${p3x} ${p4y} ${p2x} ${p4y} L ${p1x} ${p4y} C ${X} ${p4y} ${X} ${p1y} ${p1x} ${p1y} `;
              }
              default : {
                // Return rect by default
                return 'M16 48 L48 48 L48 16 L16 16 Z';
              }
            }
          },

          mouseOverNode: (node, selection) => {
            this.dbClickCreateNode = false;
            if (currentState.currentNode.mouseOverNode) return;
            const tempNode = {...node, mouseOverNode: true};
            $mouseOverNode.next(tempNode);
            // Change the node based on whether or not dragging.
            if (!this.dragging) {
              this.currentNode = node;
            } else {
              this.dragToNode = node;
            }
            currentState.currentNode.mouseOverNode = true;

            // Set the current state for which node the menu is
            // hovering over.
            currentState.currentNode.data = node;
            currentState.currentNode.selection = selection;
            this.$emit('mouseovernode', node.hash);
          },

          mouseOutNode: (node, selection, e) => {
            this.dbClickCreateNode = true;
            const tempNode = {...node, mouseOverNode: false};
            $mouseOverNode.next(tempNode);
            currentState.currentNode.mouseOverNode = false;
            this.$emit('mouseoutnode');

          },

          nodeRemove: (node) => {
            this.removeNode(node);
          },

          canDrag: () =>
            this.$data.mouseState === POINTER

        });


        /**
         Edge link tool
         */
        const radialMenuArrowTool = document.getElementById("menu-line-btn");
        const $mousedown = new Rx.Subject();
        this.graph.nodeOptions.setMouseDown((node, selection) => {
          if (this.mouseState === CREATEEDGE) {
            this.currentNode = node;
            $mousedown.next({type: 'CREATEEDGE', clickedNode: node, selection});
          }
        });
        this.linkTool = linkTool(this.graph, $mousedown, $mouseOverNode, this.toNode);
        this.linkToolDispose = this.linkTool(this.textNodes);

        // Set the action of clicking the node:
        this.graph.nodeOptions.setClickNode((node) => {
          // If the mouse is a pointer and a note is clicked on set edit mode.
          if (this.mouseState === POINTER && node.hash.slice(0, 5) === 'note-') {
            this.currentNode = node;
            $mousedown.next({
              type: 'EDITNODE',
              clickedNode: node,
              restart: this.graph.restart.styles,
              fullRestart: this.graph.restart.layout
            });
          }
//          if (this.mouseState === DELETE) {
//            // Recalculate the nodes after deleting the node.
//            this.graph.removeNode(node.hash, this.recalculateNodesOutside);
//          }
//          if (this.mouseState === PIN) {
//            if (node.fixed === undefined) {
//              node.fixed = true; // eslint-disable-line no-param-reassign
//            } else {
//              node.fixed = !node.fixed; // eslint-disable-line no-param-reassign
//            }
//            this.graph.restart.styles();
//          }
        });
        // Initiate the text edit function
        textEdit($mousedown);

        if (callback !== undefined) callback();
      },

      createNewNode() {
        var textNode = {
          id: 'snip-' + uuid.v4(),
          class: 'b-no-snip',
          nodeShape: 'rectangle',
          text: 'New',
          isSnip: false
        }
        this.addNode(textNode.id);
        const indexOfNode = this.textNodes.map(v => v.id).indexOf(textNode.id);
        if (indexOfNode === -1) this.textNodes.push(textNode);
        this.notes += 1;
        this.noteObjs = [...this.noteObjs, textNode];
        this.resetTools();
      },
      toNode(nodeProtocolObject) {
        const className = `.${nodeProtocolObject.class}`;
        const backgroundColor = $(className).css('backgroundColor');
        return {
          hash: `${nodeProtocolObject.id || nodeProtocolObject.hash}`,
          shortname: nodeProtocolObject.text,
          color: backgroundColor,
          ...nodeProtocolObject,
        };
      },
      addNodes() {
        // Adds all the prop nodes.
        this.textNodes.forEach(v => this.graph.addNode(this.toNode(v)));
      },
      addNodeHelper(nodeId, x, y) {
        // Adds nodes, and ignores the node if it can't be found.
        // This lets us optimistically create the diagram.
        const indexOfNode = this.textNodes.map(v => v.id).indexOf(nodeId);
        if (indexOfNode !== -1) {
          let node = this.toNode(this.textNodes[indexOfNode]);
          if (x && y) {
            node = {x, y, ...node};
          }
          this.graph.addNode(node);
        }
        this.recalculateNodesOutside();

        // Update tools with new nodes.
        this.resetTools();
      },
      addNode(nodeId) {
        this.addNodeHelper(nodeId);
      },

      dblClickOnPage() {
        if (!this.dbClickCreateNode) return;
        this.createNewNode()
      },

      resetTools() {
        this.linkToolDispose();
        this.linkToolDispose = this.linkTool([...this.textNodes, ...this.noteObjs]);
      },
      recalculateNodesOutside() {
        this.nodesOutsideDiagram = this.textNodes.filter((v) => {
          const result = !this.graph.hasNode(`${v.id}`);
          return result;
        });
      },
      changeMouseState(state) {
        if (!(state === DELETE
            || state === CREATEEDGE
            || state === POINTER
            || state === SAVE
            || state === ADDNOTE
            || state === CLEARSCREEN
            || state === REMOVEARROWS
            || state === PIN)) {
          console.error('Not sure what state', state, 'is');
        } else {
          this.mouseState = state;
        }
        switch (state) {
          case SAVE: {
            this.mouseState = POINTER;
            this.graph.saveGraph((savedData) => {
              this.$emit('save', savedData, this.graph.getSVGElement().node(), this.textNodes);
            });
            break;
          }
          case ADDNOTE: {
            this.mouseState = POINTER;
            this.createNewNode()
//            var textNode = {
//              id: 'snip-' + uuid.v4(),
//              class: 'b-no-snip',
//              nodeShape: 'rectangle',
//              text: 'New',
//              isSnip: false
//            }
//            this.addNode(textNode.id);
//            const indexOfNode = this.textNodes.map(v => v.id).indexOf(textNode.id);
//            if (indexOfNode === -1)
//              this.textNodes.push(textNode);
//
//            this.notes += 1;
//            this.noteObjs = [...this.noteObjs, textNode];
//            this.resetTools();
//            const node = {
//              hash: `note-${this.notes}`,
//              shortname: ['Text'],
//            };
//            this.graph.addNode(node);
//            this.notes += 1;
//            this.noteObjs = [...this.noteObjs, node];
//            this.resetTools();
            break;
          }
          case CLEARSCREEN: {
            this.mouseState = POINTER;
            this.clearScreen();
            break;
          }
          case REMOVEARROWS: {
            this.mouseState = POINTER;
            const db = this.graph.getDB();
            db.get({}, (err, l) => {
              console.log('LOOKING IN DB');
              if (err) {
                console.error(err);
              }
              console.log(l);
              l.forEach((triplet) => {
                console.log(this.graph);
                const node = {
                  object: {hash: triplet.object},
                  predicate: {type: triplet.predicate},
                  subject: {hash: triplet.subject},
                };
                this.graph.removeTriplet(node);
              });
            });
            break;
          }
          default:
            break;
        }
      },
    },
  };
</script>

<style>

  tooltip {
    /*position: absolute;*/
    text-align: left;
    width: 100px;
    height: 80px;
    padding: 8px;
    font: 10px sans-serif;
    background: red;
    border: solid 1px #aaa;
    border-radius: 8px;
    pointer-events: none;
  }

  .node-status-icons .fa{
    font-size: 12px !important;
    color: #575959;
  }

  .radial-menu {
    /*pointer-events: none;*/
    cursor: pointer; cursor: hand;
  }

  .radial-menu .tools {
    padding-left: 4px;
    color: #575959;
  }

  .radial-menu .tools .fa {
    font-size: 20px !important;
  }

  .radial-menu i
  {
    display: inline-block;
    border-radius: 50%;
    box-shadow: 0px 0px 2px #82d2d2;
    background-color: #edfdfd;
    padding-left: 4px;
    padding-right: 4px;
    padding-top: 3px;
    padding-bottom: 3px;
    margin-bottom: 4px;
  }

  /*This prevents the dirty highlighting of the svg text*/
  svg text {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  svg text::selection {
    background: none;
  }

  /*Ghazal Start*/
  /*.node:hover .b-snip-arg-for {*/
  /*fill: rgba(227, 246, 205, 0.7) !important;*/
  /*}*/

  /*.node:hover .b-snip-arg-against {*/
  /*fill: rgba(252, 224, 238, 0.7) !important;*/
  /*}*/

  /*.node:hover .b-snip-evidence {*/
  /*fill: rgba(246, 231, 204, 0.7) !important;*/
  /*}*/

  /*.node:hover .b-snip-source {*/
  /*fill: rgba(230, 230, 230, 0.7) !important;*/
  /*}*/

  /*Ghazal End*/

</style>
