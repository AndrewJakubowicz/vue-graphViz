<template>
  <div id="graph-viz">
    <link v-once rel="stylesheet" href="./static/fonts/font-awesome/css/font-awesome.css"/>
    <!-- <link v-once rel="stylesheet" href="./static/style.css" /> -->

    <nodeList v-bind:nodesOutside='nodesOutsideDiagram' @clickedNodeInList="addNode($event)"/>
    <toolBar @clickedAction="changeMouseState($event)" @mouseEnter="deleteRadial()"/>
    <photoshop-picker v-show="ifColorPickerOpen"
                      :style="styleObject"
                      :value="colors"
                      @ok="onColorOk"
                      @cancel="onColorCancel"
                      @input="updateFromPicker"
                      @change="updateFromInput"
                      ref="vueColorPicker">
    </photoshop-picker>
    <div id="graph" v-on:dblclick="dblClickOnPage"></div>

  </div>
</template>

<script>
  /**
   Event emitters:
   - mouseovernode, nodeId - String
   - mouseoutnode, void
   */
  import uuid from 'uuid';
  import {Photoshop} from 'vue-color'
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
  const SELECT = 'SELECT';
  const TEXTEDIT = 'TEXTEDIT';
  const IMPORTPROB = 'IMPORTPROB';

  // ACTIONS
  const UNDO = 'UNDO';
  const REDO = 'REDO';
  const ADDNODE = 'ADDNODE';
  const DELETENODE = 'DELETENODE';
  const DELEDGE = 'DELEDGE';
  const CLEARHISTORY = 'CLEARHISTORY';
  const NODEEDIT = 'NODEEDIT';
  const EDGEEDIT = 'EDGEEDIT';
  const SHAPE = 'SHAPE';
  const COLOR = 'COLOR';
  const TEXT = 'TEXT';
  const WIDTH = 'WIDTH';


  export default {
    props: ['hypothesisId', 'nodes', 'highlightedNodeId', 'savedDiagram', 'width', 'height', 'textNodes', 'imgDropGraph', 'getDlist'],
    name: 'graph-viz',
    components: {
      nodeList,
      toolBar,
      'photoshop-picker': Photoshop
    },
    data() {
      return {
        ifColorPickerOpen: false,
        updateValue: null,
        styleObject: {
          top: '230px',
          left: '230px',
          position: 'absolute'
        },
        colors: {
          hex: '#1BAD64',
          hsl: {h: 150, s: 0.5, l: 0.2, a: 1},
          hsv: {h: 150, s: 0.66, v: 0.30, a: 1},
          rgba: {r: 25, g: 77, b: 51, a: 1},
          a: 1
        },
        graph: undefined,
        nodesOutsideDiagram: [],
        mouseState: POINTER,
        linkTool: undefined,
        linkToolDispose: undefined, // Subscription disposing.
        notes: 0,
        noteObjs: [],
        dbClickCreateNode: true,
        canKeyboardUndo: true,
        rootObservable: new Rx.Subject(),
        scale: 1
      };
    },
    mounted() {
      this.actions(this.rootObservable);
      this.graphClicked = true;

      const $paste = Rx.Observable.fromEvent(document, 'paste')
        .filter(() => this.clickedGraphViz)
        .filter(() => !this.ifColorPickerOpen)
        .filter(() => this.mouseState === POINTER)
        .subscribe((e) => {
          this.rootObservable.next({
            type: ADDNODE,
            newNode: { text: e.clipboardData.getData('text/plain') },
          });
        });

      const ctrlDown = Rx.Observable.fromEvent(document, 'keydown')
        .filter(e => e.ctrlKey);

      ctrlDown.filter(e => e.keyCode === 90 && !e.shiftKey)
        .filter(() => this.canKeyboardUndo)
        .subscribe((e) => {
          e.preventDefault();
          this.rootObservable.next({ type: UNDO });
        });

      ctrlDown.filter(e => e.keyCode === 89 || (e.keyCode === 90 && e.shiftKey))
        .filter(() => this.canKeyboardUndo)
        .subscribe((e) => {
          e.preventDefault();
          this.rootObservable.next({ type: REDO });
        });

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

              predicate: x.predicate,

            });
          });
        }
      });
    },
    watch: {
      imgDropGraph(current, old) {
        let me = this;

        function imageToBase64(img) {
          if (!img) return;
          var canvas, ctx, dataURL, base64;
          canvas = document.createElement('canvas');
          ctx = canvas.getContext('2d');
          var cw = canvas.width;
          var ch = canvas.height;
          var maxW = 150;
          var maxH = 100;
          var iw = img.width;
          var ih = img.height;
          var scale = Math.min((maxW / iw), (maxH / ih));
          var iwScaled = iw * scale;
          var ihScaled = ih * scale;
          canvas.width = iwScaled;
          canvas.height = ihScaled;
          ctx.drawImage(img, 0, 0, iwScaled, ihScaled);
          dataURL = canvas.toDataURL('image/png');
          base64 = dataURL.replace(/^data:image\/png;base64,/, '');
          return base64;
        }

        let img = document.querySelector('[src = "' + current.imgSrc + '"]');
        if (!img) return;
        let base64 = imageToBase64(img);
        var parts = img.getAttribute('src').split('/');
        var id = parts[parts.length - 1];
        if (current.dropped && current.dropped !== old.dropped) {
          if (!current.existingNode) {
            this.rootObservable.next({
              type: ADDNODE,
              newNode: { text: '<img style="max-width:80px; max-height:80px; width:auto; height:auto;" id="' + id + '" src="data:image/png;base64,' + base64 + '"/>\nNew' },
            });
          } else {
            let node = null;
            const indexOfNode = me.textNodes.map(v => v.id).indexOf(current.existingNode.id);
            if (indexOfNode === -1) {
              return;
            }
            node = this.toNode(this.textNodes[indexOfNode]);
            if (node.text.includes('<img')) {
              node.text = node.text.replace(/<img[^>]*>/g, '');
              node.text = node.text.replace(/\n/g, '');
            }
            this.rootObservable.next({
              type: NODEEDIT,
              prop: TEXT,
              value: '<img style="max-width:80px; max-height:80px; width:auto; height:auto;" id="' + id + '" src="data:image/png;base64,' + base64 + '"/>\n' + node.text,
              id: current.existingNode.id,
            });
          }
        }
      },
      width(current, old) { // this appears to do nothing
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
            predicate: x.predicate,
          });
        });
      },
    },

    methods: {

      onColorOk (ev) {
        this.ifColorPickerOpen = false
        let newColor = '#FFFFFF'
        if (!this.colors) {
          return
        }
        if (typeof this.colors === 'object') {
          newColor = this.colors.hex
        } else if (typeof this.colors === 'string' && this.colors.startsWith('#')){
          newColor = this.colors
        }
        this.coloredEl[0].setAttribute('fill', newColor)
        this.rootObservable.next({
          type: NODEEDIT,
          prop: COLOR,
          value: newColor,
          id: this.coloredNode.id,
        })
      },

      onColorCancel (ev) {
        this.ifColorPickerOpen = false
      },

      updateFromPicker(value) {
        this.colors = value;
        console.log('changed by picker');
      },

      updateFromInput(event) {
        console.log('changed by input');
      },

      actions($action) {
        const addNode = (action) => {
          // if no node, create new node
          if (action.newNode) {
            const textNode = {
              id: 'note-' + uuid.v4(),
              class: 'b-no-snip',
              nodeShape: 'rect',
              text: action.newNode.text ? action.newNode.text : 'New',
              isSnip: false,
              fixed: true,
              color: '#ffffff',
              fixedWidth: false,
            };
            const indexOfNode = this.textNodes.map(v => v.id).indexOf(textNode.id);
            if (indexOfNode === -1) this.textNodes.push(textNode);
            if (action.newNode.x && action.newNode.y) {
              this.addNodeHelper(textNode.id, action.newNode.x, action.newNode.y);
            } else {
              this.addNodeHelper(textNode.id);
            }
            this.notes += 1;
            this.noteObjs = [...this.noteObjs, textNode];
            this.resetTools();
            return textNode;
          }
          // if existing node, add to graph
          if (action.existingNode) {
            this.graph.addNode(this.toNode(action.existingNode));
            this.recalculateNodesOutside();
            // TODO fixed width nodes on addition size incorrectly. 2nd restart required
            this.graph.restart.layout();
            return action.existingNode;
          }
          // if prob import
          // TODO finish addNode method. support multiple node addition, simplify node addition and creation
          if (action.probNode) {
            const n = action.probNode;
            const indexOfNode = this.textNodes.map(v => v.id).indexOf(n.id);
            if (indexOfNode === -1) this.textNodes.push(n);
            this.addNodeHelper(n.id);
            this.notes += 1;
            this.noteObjs = [...this.noteObjs, n];
            this.resetTools();
            return n;
          }
        };

        const delNode = (nodeId) => {
          this.graph.removeNode(nodeId, this.recalculateNodesOutside);
        };

        const delEdge = (triplet) => {
          if (Array.isArray(triplet)) {
            triplet.forEach(t => this.graph.removeTriplet(t));
          } else {
            this.graph.removeTriplet(triplet);
          }
        };

        let undoStack = [];
        let redoStack = [];

        $action
          .do((action) => {
            if (!(action.type === UNDO || action.type === REDO)) {
              redoStack = [];
            }
          })
          .do((action) => {
            switch (action.type) {
              // each action MUST push an action to the undo stack.

              case UNDO: {
                if (undoStack.length > 0) {
                  const saveRedo = redoStack;
                  const nextAction = undoStack.pop();
                  if (nextAction.type === DELETENODE || nextAction.type === CREATEEDGE) {
                    nextAction.callback = () => {
                      redoStack = saveRedo;
                      redoStack.push(undoStack.pop());
                    };
                    this.rootObservable.next(nextAction);
                  } else {
                    this.rootObservable.next(nextAction);
                    redoStack = saveRedo;
                    redoStack.push(undoStack.pop());
                  }
                }
                break;
              }

              case REDO: {
                if (redoStack.length > 0) {
                  const saveRedo = redoStack;
                  this.rootObservable.next(redoStack.pop());
                  redoStack = saveRedo;
                }
                break;
              }

              case CLEARHISTORY: {
                undoStack = [];
                redoStack = [];
                break;
              }

              case ADDNODE: {
                const node = addNode(action);
                undoStack.push({
                  type: DELETENODE,
                  id: node.id,
                });
                break;
              }

              case DELETENODE: {
                // get all edges attached to node
                const db = this.graph.getDB();
                const node = this.graph.getNode(action.id);
                const subjectEdges = new Promise((resolve, reject) => {
                  db.get({ subject: node.id }, (err, l) => {
                    if (err) {
                      reject(err);
                    } else {
                      resolve(l);
                    }
                  });
                });

                const objectEdges = new Promise((resolve, reject) => {
                  db.get({ object: node.id }, (err, l) => {
                    if (err) {
                      reject(err);
                    } else {
                      resolve(l);
                    }
                  });
                });

                Promise.all([subjectEdges, objectEdges])
                  .then((values) => {
                    const edges = [].concat.apply([], values)
                      .map((x) => {
                        const indexOfSubject = this.textNodes.map(v => v && v.id).indexOf(x.subject);
                        const indexOfObject = this.textNodes.map(v => v && v.id).indexOf(x.object);
                        if (indexOfSubject !== -1 && indexOfObject !== -1) {
                          return {
                            subject: this.toNode(this.textNodes[indexOfSubject]),
                            predicate: x.predicate,
                            object: this.toNode(this.textNodes[indexOfObject]),
                          };
                        }
                      });
                    // delete all edges attached to node
                    if (edges.length > 0) {
                      this.rootObservable.next({
                        type: DELEDGE,
                        tripletObject: edges,
                      });
                    }
                    // delete node
                    delNode(node.id);
                    undoStack.push({
                      type: ADDNODE,
                      existingNode: node,
                    });

                    if (action.callback) {
                      action.callback();
                    }
                  })
                  .catch(err => console.log(err));

                break;
              }

              case NODEEDIT: {
                let oldValues;
                const idArray = Array.isArray(action.id) ? action.id : [action.id];
                const values = Array.isArray(action.value) ? action.value : [action.value];
                const nodeIndices = idArray.map(id => this.textNodes.findIndex(x => x.id === id));
                const multipleValues = (values.length > 1) && (idArray.length === values.length);
                const textNodesEditHelper = (prop) => {
                  oldValues = nodeIndices.map(x => this.textNodes[x][prop]);
                  nodeIndices.forEach((nodeIndex, i) => {
                    if (multipleValues) {
                      this.textNodes[nodeIndex][prop] = values[i];
                    } else {
                      this.textNodes[nodeIndex][prop] = values[0];
                    }
                  });
                };
                switch (action.prop) {
                  case TEXT: {
                    textNodesEditHelper('text');
                    this.graph.editNode({
                      property: 'shortname',
                      id: idArray,
                      value: values,
                    });
                    break;
                  }

                  case PIN: {
                    textNodesEditHelper('fixed');
                    this.graph.editNode({
                      property: 'fixed',
                      id: idArray,
                      value: values,
                    });
                    break;
                  }

                  case WIDTH: {
                    textNodesEditHelper('fixedWidth');
                    this.graph.editNode({
                      property: 'fixedWidth',
                      id: idArray,
                      value: values,
                    });
                    break;
                  }

                  case COLOR: {
                    textNodesEditHelper('color');
                    this.graph.editNode({
                      property: 'color',
                      id: idArray,
                      value: values,
                    });
                    break;
                  }

                  case SHAPE: {
                    textNodesEditHelper('nodeShape');
                    this.graph.editNode({
                      property: 'nodeShape',
                      id: idArray,
                      value: values,
                    });
                    break;
                  }

                  default : {
                    console.log('Unknown property:', action.prop);
                  }
                }
                undoStack.push({
                  type: action.type,
                  prop: action.prop,
                  value: oldValues,
                  id: action.id,
                });
                break;
              }

              case CREATEEDGE: {
                const triplet = action.tripletObject;
                if (Array.isArray(triplet)) { // TODO error handling for multiple edge creation
                  triplet.forEach(t => this.graph.addTriplet(t));
                  undoStack.push({
                    type: DELEDGE,
                    tripletObject: triplet,
                  });
                  if (action.callback) {
                    action.callback();
                  }
                } else {
                  const promise = this.graph.addTriplet(triplet);
                  promise.then(() => {
                    undoStack.push({
                      type: DELEDGE,
                      tripletObject: triplet,
                    });
                    if (action.callback) {
                      action.callback();
                    }
                  })
                    .catch((err) => {
                      console.log(err);
                    });
                }
                break;
              }

              case DELEDGE: {
                delEdge(action.tripletObject);
                undoStack.push({
                  type: CREATEEDGE,
                  tripletObject: action.tripletObject,
                });
                break;
              }

              case EDGEEDIT: {
                let oldValues;
                const idArray = Array.isArray(action.hash) ? action.hash : [action.hash];
                const values = Array.isArray(action.value) ? action.value : [action.value];
                const predicates = idArray.map(id => this.graph.getPredicate(id));
                switch (action.prop) {
                  case TEXT: {
                    oldValues = predicates.map(p => p.text);
                    this.graph.editEdge({
                      property: 'text',
                      id: idArray,
                      value: values,
                    });
                    this.graph.restart.layout();
                    break;
                  }

                  default : {
                    console.log('Unknown property:', action.prop);
                  }
                }
                undoStack.push({
                  type: action.type,
                  prop: action.prop,
                  value: oldValues,
                  hash: action.hash,
                });
                break;
              }

              default: {
                console.log('Unknown action:', action.type);
              }
            }
          })
          .subscribe(
            action => console.log('action', action, undoStack, redoStack),
            console.error,
            () => console.log('FINISH'),
          );
      },

      deleteRadial() {
        $('.menu-color').remove();
        $('.menu-shape').remove();
        $('.menu-action').remove();
        $('.menu-trash').remove();
        $('.menu-hover-box').remove();
        $('.edge-hover-menu').remove();
        $('.menu-resize').remove();
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
        const $mousedown = new Rx.Subject();
        let me = this;
        const currentState = {
          currentNode: {
            data: {},
            selection: {},
            mouseOverNode: false,
          },
          startedDragAt: '',
          nodeMap: new Map(),
        };
        this.$on('mouseovernode', function () {
        });

        this.graph = networkViz('graph', {
          layoutType: 'jaccardLinkLengths',
          edgeLength: 170,
          jaccardModifier: 0.9,
          height: document.getElementById(this.$el.id).clientHeight,
          width: document.getElementById(this.$el.id).clientWidth,
          edgeSmoothness: 15,

          nodeToColor: function nodeToColor(d) {
            return d.color ? d.color : ' "#ffffff"';
          },

          nodeToPin: function nodeToPin(d) {
            return d.fixed ? d.fixed : false;
          },

          updateNodeColor: (node, color) => {
            this.rootObservable.next({
              type: NODEEDIT,
              prop: COLOR,
              value: color,
              id: node.id,
            });
          },

          updateNodeShape: (node, shape) => {
            this.rootObservable.next({
              type: NODEEDIT,
              prop: SHAPE,
              value: shape,
              id: node.id,
            });
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

          mouseOverRadial: (node) => {
            this.dbClickCreateNode = false;
          },

          mouseOutRadial: (node) => {
            if (!this.ifColorPickerOpen) {
              this.dbClickCreateNode = true;
            }
          },

          zoomScale: (scale) => {
            this.scale = scale
          },

          mouseOverBrush: (ev, element, node ) => {
            me.dbClickCreateNode = false
            me.ifColorPickerOpen = true
            me.coloredEl = element._groups[0]
            me.coloredNode = node
            me.colors = node.color
            me.$refs.vueColorPicker.currentColor = node.color
//            me.$refs.vueColorPicker.inputChange(node.color)

            let grapgEditor = document.getElementById('graph').getBoundingClientRect()
            let graphEditorX = grapgEditor.x
            let graphEditorY = grapgEditor.y
            let graphEditorW = grapgEditor.width
            let graphEditorH = grapgEditor.height
            let posX = ev.clientX - graphEditorX
            let posY = node.y

            if (posX + 400 > graphEditorW) {
              posX = posX - 400
            }
            if (posY < 0 ){
              posY = 0
            }
            if (posY + 400 > graphEditorH) {
              posY = posY - (posY + 400 - graphEditorH)
            }
            this.styleObject = {
              position: 'absolute !important',
              top: posY + 'px !important',
              left: posX + 'px !important',
              'z-index': '9999'
            }
          },

          mouseOverNode: (node, selection) => {
            me.dbClickCreateNode = false;
            me.clickedGraphViz = false;
            if (currentState.currentNode.mouseOverNode) return;
            const tempNode = { ...node, mouseOverNode: true };
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
            me.dbClickCreateNode = true;
            me.clickedGraphViz = true;
            const tempNode = { ...node, mouseOverNode: false };
            $mouseOverNode.next(tempNode);
            currentState.currentNode.mouseOverNode = false;
            this.$emit('mouseoutnode');
          },

          startArrow: (node, selection) => {
            // console.log("startArrow", node, selection, this.toNode);
            // console.log(this.$data.mouseState);
            this.mouseState = CREATEEDGE;
            this.currentNode = node;
            $mousedown.next({ type: 'CREATEEDGE', clickedNode: node, selection });
          },

          clickPin: (node, element) => {
            this.rootObservable.next({
              type: NODEEDIT,
              prop: PIN,
              id: node.id,
              value: !node.fixed,
            });
          },

          nodeRemove: (node) => {
            this.rootObservable.next({
              type: DELETENODE,
              id: node.id,
            });
          },

          edgeRemove: (edge) => {
            this.rootObservable.next({
              type: DELEDGE,
              tripletObject: edge,
            });
          },

          resizeDrag: (node, selection, event) => {
            if (this.mouseState === TEXTEDIT) {
              return;
            }
            this.isResizing = true;
            const initialX = event.clientX;
            const svgInitialX = this.transformCoordinates({ x: initialX, y: event.clientY }).x;
            const initWidth = node.width;
            Rx.Observable.fromEvent(document, 'mousemove')
              .do(e => e.stopPropagation())
              .map(e => this.transformCoordinates({ x: e.clientX, y: event.clientY }).x)
              .map(moveX => moveX - svgInitialX)
              .map(dx => initWidth + (dx * 2))
              .filter((width) => {
                const img = selection.node().parentNode.querySelector('text img');
                const imgWidth = img ? img.offsetWidth : 0;
                const minWidth = imgWidth + 30;
                return width > minWidth;
              })
              .debounceTime(10)
              .takeUntil(Rx.Observable.fromEvent(document, 'mouseup'))
              .finally(() => {
                this.isResizing = false;
                this.rootObservable.next({
                  type: NODEEDIT,
                  prop: WIDTH,
                  id: node.id,
                  value: node.fixedWidth,
                });
              })
              .subscribe((x) => {
                node.fixedWidth = x;
                this.graph.restart.layout();
              });
          },

          canDrag: () => this.$data.mouseState === POINTER && !this.isResizing,
        });


        /**
         Edge link tool
         **/
        // commented out: drawing arrows via the side panel
        // this.graph.nodeOptions.setMouseDown((node, selection) => {
        //   if (this.mouseState === CREATEEDGE) {
        //     console.log("setMouseDown",this,node,selection);
        //     this.currentNode = node;
        //     $mousedown.next({type: 'CREATEEDGE', clickedNode: node, selection});
        //   }
        // });
        this.linkTool = linkTool(this.graph, $mousedown, $mouseOverNode, this.toNode, (tripletObject) => {
          this.rootObservable.next({
            type: CREATEEDGE,
            tripletObject: tripletObject,
          });
        }, () => {
          this.mouseState = POINTER;
        });
        this.linkToolDispose = this.linkTool(this.textNodes);
        // Set the action of clicking the edge:
        this.graph.edgeOptions.setClickEdge((edge, elem) => {
          if (this.mouseState === POINTER || this.mouseState === CREATEEDGE) {
            $mousedown.next({
              type: 'EDITEDGE',
              edge: edge,
              restart: this.graph.restart.layout,
              textElem: elem.node().querySelector('text'),
              clickedElem: elem,
              save: (newText) => {
                this.rootObservable.next({
                  type: EDGEEDIT,
                  prop: TEXT,
                  value: newText,
                  hash: edge.predicate.hash,
                });
              },
            });
          }
        });

        // Set the action of clicking the node:
        this.graph.nodeOptions.setClickNode((node, elem) => {
          // If the mouse is a pointer and a note is clicked on set edit mode.
          if (this.mouseState === POINTER && node.hash.slice(0, 5) === 'note-') {
            this.currentNode = node;
            $mousedown.next({
              type: 'EDITNODE',
              clickedNode: node,
              restart: this.graph.restart.layout,
              textElem: elem.node().parentNode.querySelector('text'),
              clickedElem: elem,
              save: (newText) => {
                this.rootObservable.next({
                  type: NODEEDIT,
                  prop: TEXT,
                  value: newText,
                  id: node.id,
                });
              },
            });
          }
        });
        // Initiate the text edit function - for both nodes and edges
        textEdit($mousedown, () => {
          this.canKeyboardUndo = false;
          this.deleteRadial();
          this.mouseState = TEXTEDIT;
        }, () => {
          this.canKeyboardUndo = true;
          this.mouseState = POINTER;
        });

        // set clickedgraphviz to true first time user clicks
        const svgElem = this.graph.getSVGElement().node();
        Rx.Observable.fromEvent(svgElem, 'click')
          .take(1)
          .subscribe(() => {
            this.clickedGraphViz = true;
          });

        // TODO find permanent solution to nodes created wrong size upon loading
        setTimeout(this.graph.restart.layout, 50);

        if (callback !== undefined) callback();
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
            node = { x, y, ...node };
          }
          this.graph.addNode(node);
        }
        this.recalculateNodesOutside();

        // Update tools with new nodes.
        this.resetTools();
      },

      addNode(nodeId) {
        this.addNodeHelper(nodeId);
        // TODO fixed width nodes on addition size incorrectly. 2nd restart required.
        this.graph.restart.layout();
      },

      dblClickOnPage(e) {
        if (!this.dbClickCreateNode || this.ifColorPickerOpen || this.mouseState === TEXTEDIT) return;
        const coords = this.transformCoordinates({ x: e.clientX, y: e.clientY });
        this.rootObservable.next({
          type: ADDNODE,
          newNode: coords,
        });
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
            || state === IMPORTPROB
            || state === REMOVEARROWS
            || state === PIN
            || state === SELECT
            || state === UNDO
            || state === REDO)) {
          console.error('Not sure what state', state, 'is');
        } else {
          this.mouseState = state;
        }
        switch (state) {
          case SAVE: {
            this.mouseState = POINTER;
            this.deleteRadial();
            setTimeout(() => {
              this.graph.saveGraph((savedData) => {
                this.$emit('save', savedData, this.graph.getSVGElement().node(), this.textNodes, this.scale);
              });
            }, 50);
            break;
          }
          case ADDNOTE: {
            this.mouseState = POINTER;
            this.rootObservable.next({
              type: ADDNODE,
              newNode: true,
            });
            break;
          }
          case CLEARSCREEN: {
            this.mouseState = POINTER;
            this.clearScreen();
            this.rootObservable.next({ type: CLEARHISTORY });
            break;
          }

          case IMPORTPROB: {
            // test case
            // const Dlist = { X: new Set(), Y: new Set('X'), Z: new Set('X'), A: new Set('B'), B: new Set() };
            this.mouseState = POINTER;
            const Dlist = this.getDlist && this.getDlist();
            if (!Dlist || Object.keys(Dlist).length === 0) return;
            const listOfNodes = {};
            const listOfEdges = [];
            Object.keys(Dlist).forEach((D) => {
              listOfNodes[D] = this.toNode({
                id: 'note-' + uuid.v4(),
                class: 'b-no-snip',
                nodeShape: 'circle',
                text: D,
                isSnip: false,
                fixed: false,
                color: '#ffffff',
                fixedWidth: false,
              });
            });

            Object.values(listOfNodes).forEach((node) => {
              this.rootObservable.next({
                type: ADDNODE,
                probNode: node,
              });
            });

            Object.entries(Dlist).forEach(([key, val]) => {
              val.forEach((n) => {
                listOfEdges.push({
                  subject: listOfNodes[n],
                  predicate: {
                    type: 'arrow',
                    text: '',
                    hash: uuid.v4(),
                    subject: listOfNodes[n].id,
                    object: listOfNodes[key].id,
                    constraint: {
                      axis: 'y',
                      type: 'separation',
                      leftID: listOfNodes[n].id,
                      rightID: listOfNodes[key].id,
                      gap: 170,
                    },
                  },
                  object: listOfNodes[key],
                });
              });
            });

            this.rootObservable.next({
              type: CREATEEDGE,
              tripletObject: listOfEdges,
            });
            //TODO: get a promise for when edge creation completes
            setTimeout(this.graph.restart.handleDisconnects, 250);
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


              const triplets = l.map((x) => {
                const indexOfSubject = this.textNodes.map(v => v && v.id).indexOf(x.subject);
                const indexOfObject = this.textNodes.map(v => v && v.id).indexOf(x.object);
                if (indexOfSubject !== -1 && indexOfObject !== -1) {
                  return {
                    subject: this.toNode(this.textNodes[indexOfSubject]),
                    predicate: x.predicate,
                    object: this.toNode(this.textNodes[indexOfObject]),
                  };
                }
              });
              this.rootObservable.next({
                type: DELEDGE,
                tripletObject: triplets,
              });
            });
            break;
          }
          case UNDO: {
            this.mouseState = POINTER;
            this.rootObservable.next({ type: UNDO });
            break;
          }
          case REDO: {
            this.mouseState = POINTER;
            this.rootObservable.next({ type: REDO });
            break;
          }
          default:
            break;
        }
      },

      transformCoordinates({ x, y }) {
        const svg = this.graph.getSVGElement().node();
        const transformGroup = svg.querySelector('g');
        const screenPoint = svg.createSVGPoint();
        screenPoint.x = x;
        screenPoint.y = y;
        const CTM = transformGroup.getScreenCTM();
        const point = screenPoint.matrixTransform(CTM.inverse());
        return {
          x: point.x,
          y: point.y,
        };
      },

      updateCanvasSize() {
        const wrapperElm = document.getElementById('xb-arg-map');
        this.graph.canvasOptions.setWidth(wrapperElm.clientWidth);
        this.graph.canvasOptions.setHeight(wrapperElm.clientHeight);
      },
    },
  };
</script>

<style>
  .vc-photoshop {
    width: 400px !important;
    max-height: 233px !important;
  }

  .vc-ps-ac-btn {
    margin-bottom: 3px !important;
  }

  .vc-ps-fields .vc-input__input {
    margin-bottom: 2px !important;
  }

  .vc-ps-saturation-wrap {
    max-height: 200px !important;
  }
  .vc-ps-hue-wrap {
    max-height: 200px !important;
  }

  .vc-ps-fields .vc-input__desc {
    right: 10px !important;
  }

  .vc-ps-body {
    padding: 5px !important;
  }

</style>

<style>
  .medium-editor-toolbar li button {
    font-size: 16px !important;
  }

  .medium-editor-button-active {
    background-color: #000 !important;
    color: #56e8e8 !important;
  }

  .medium-editor-element {
    min-height: inherit;
  }

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

  .node-status-icons .fa {
    font-size: 12px !important;
    color: #575959;
  }

  .icon-wrapper {
    margin-top: 1px !important;
    display: inline-block;
    width: 22px;
  }

  .icon-wrapper .pinned, .icon-wrapper .unpinned {
    border-radius: 100%;
    border: 1px solid #fff;
    box-shadow: 0 1px 10px rgba(0, 0, 0, 0.46);
    display: table-cell;
    font-size: 15px;
    height: 15px;
    padding: 2px;
    text-align: center;
    transition: 2s;
    vertical-align: middle;
    width: 22px;
  }

  .icon-wrapper .pinned {
    background: rgba(182, 239, 239, 1);
    color: #575959;
  }

  .icon-wrapper .unpinned {
    background: rgba(182, 239, 239, 0.3);
    color: #9b9da0;
    -webkit-text-stroke: 1px #9b9da0;
    -webkit-text-fill-color: rgba(182, 239, 239, 0.3);
  }

  .menu-shape, .menu-color, .menu-action, .menu-trash {
    cursor: pointer;
    cursor: hand;
  }

  .menu-color .fa-paint-brush {
    font-size: 19px !important;
  }

  .icon-wrapper .custom-icon {
    background: rgba(182, 239, 239, 0.3);
    border-radius: 100%;
    border: 1px solid #fff;
    box-shadow: 0 1px 10px rgba(0, 0, 0, 0.46);
    color: #575959;
    display: table-cell;
    font-size: 15px;
    height: 15px;
    padding: 2px;
    text-align: center;
    transition: 2s;
    vertical-align: middle;
    width: 22px;
  }

  .custom-icon:hover {
    background: rgba(182, 239, 239, 1);
  }

  .fix-editor {
    display: none;
  }

  .icon-wrapper {
    display: inline-block;
  }

  /*This prevents the dirty highlighting of the svg text*/
  svg text, svg text * {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
  }

  svg text, svg text * {
    font-size: 22px;
    display: inherit;
    -webkit-margin-after: 0;
    -webkit-margin-before: 0;
  }

  text {
    font-family: "Source Sans Pro", sans-serif !important;
    font-weight: 100 !important;
  }

  svg text::selection {
    background: none;
  }

  svg text.allowSelection {
    -webkit-user-select: unset;
    -moz-user-select: unset;
    -ms-user-select: unset;
    user-select: unset;
    padding-left: 1px;
  }

  svg text.allowSelection::selection, svg text.allowSelection *::selection, svg text.allowSelection p::selection {
    background-color: highlight;
    color: highlighttext;
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

  #svgcontainer #controls {
    display: inline-block;
    height: 42px;
  }

  #controls {
    /*margin-left: 2px;*/
    vertical-align: 16px;
  }

  #controls div {
    margin: 0px 0px 5px 0px;
  }

  #controls span[data-type='color'] {
    display: inline-block;
    /* background-color: #F00; */
    border: 1px solid #AFAFAF;
    box-shadow: 0 1px 10px rgba(0, 0, 0, 0.46);
    border-radius: 40px;
    padding: 0px;
    margin: 0px;
    width: 22px;
    height: 22px;
    vertical-align: bottom;
  }

  .colpick {
    position: absolute;
    width: 346px;
    height: 170px;
    overflow: hidden;
    display: none;
    font-family: Arial, Helvetica, sans-serif;
    background: #EBEBEB;
    border: 1px solid #BBB;
    border-radius: 5px;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -o-user-select: none;
    user-select: none;
  }

  .colpick_color {
    position: absolute;
    left: 7px;
    top: 7px;
    width: 156px;
    height: 156px;
    overflow: hidden;
    outline: 1px solid #AAA;
    cursor: crosshair;
  }

  .colpick_color_overlay1,
  .colpick_color_overlay2 {
    position: absolute;
    left: 0;
    top: 0;
    width: 156px;
    height: 156px;
  }

  .colpick_color_overlay1 {
    background: linear-gradient(to right, white 0%, rgba(255, 255, 255, 0) 100%);
  }

  .colpick_color_overlay2 {
    background: linear-gradient(to bottom, transparent 0%, black 100%);
  }

  .colpick_selector_outer {
    background: none;
    position: absolute;
    width: 11px;
    height: 11px;
    margin: -6px 0 0 -6px;
    border: 1px solid #000;
    border-radius: 50%;
  }

  .colpick_selector_inner {
    position: absolute;
    width: 9px;
    height: 9px;
    border: 1px solid #FFF;
    border-radius: 50%;
  }

  .colpick_hue {
    position: absolute;
    top: 6px;
    left: 175px;
    width: 19px;
    height: 156px;
    border: 1px solid #AAA;
    cursor: n-resize;
  }

  .colpick_hue_arrs {
    position: absolute;
    left: -8px;
    width: 35px;
    height: 7px;
    margin: -7px 0 0 0;
  }

  .colpick_hue_larr,
  .colpick_hue_rarr {
    position: absolute;
    width: 0;
    height: 0;
    border-top: 6px solid transparent;
    border-bottom: 6px solid transparent;
  }

  .colpick_hue_larr {
    border-left: 7px solid #858585;
  }

  .colpick_hue_rarr {
    right: 0;
    border-right: 7px solid #858585;
  }

  .colpick_new_color,
  .colpick_current_color {
    position: absolute;
    top: 6px;
    width: 60px;
    height: 27px;
    background: #F00;
    border: 1px solid #8F8F8F;
  }

  .colpick_new_color {
    left: 207px;
  }

  .colpick_current_color {
    left: 277px;
  }

  .colpick_field,
  .colpick_hex_field {
    position: absolute;
    height: 20px;
    width: 60px;
    overflow: hidden;
    background: #F3F3F3;
    color: #B8B8B8;
    font-size: 12px;
    border: 1px solid #BDBDBD;
    border-radius: 3px;
  }

  .colpick_rgb_r,
  .colpick_rgb_g,
  .colpick_rgb_b,
  .colpick_hex_field {
    left: 207px;
  }

  .colpick_hsb_h,
  .colpick_hsb_s,
  .colpick_hsb_b {
    left: 277px;
  }

  .colpick_rgb_r,
  .colpick_hsb_h {
    top: 40px;
  }

  .colpick_rgb_g,
  .colpick_hsb_s {
    top: 67px;
  }

  .colpick_rgb_b,
  .colpick_hsb_b {
    top: 94px;
  }

  .colpick_hex_field {
    width: 68px;
    top: 121px;
  }

  .colpick_focus {
    border-color: #999;
  }

  .colpick_field_letter {
    position: absolute;
    width: 12px;
    height: 20px;
    line-height: 20px;
    padding-left: 4px;
    background: #EFEFEF;
    border-right: 1px solid #BDBDBD;
    font-weight: bold;
    color: #777;
  }

  .colpick_field input,
  .colpick_hex_field input {
    position: absolute;
    right: 11px;
    margin: 0;
    padding: 0;
    height: 20px;
    line-height: 20px;
    background: transparent;
    border: none;
    font-size: 12px;
    font-family: Arial, Helvetica, sans-serif;
    color: #555;
    text-align: right;
    outline: none;
  }

  .colpick_hex_field input {
    outline: none;
    right: 4px;
  }

  .colpick_field_arrs,
  .colpick_field_uarr,
  .colpick_field_darr {
    position: absolute;
  }

  .colpick_field_arrs {
    top: 0;
    right: 0;
    width: 9px;
    height: 21px;
    cursor: n-resize;
  }

  .colpick_field_uarr {
    top: 5px;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-bottom: 4px solid #959595;
  }

  .colpick_field_darr {
    bottom: 5px;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 4px solid #959595;
  }

  .colpick_submit {
    position: absolute;
    left: 207px;
    top: 146px;
    width: 130px;
    height: 18px;
    line-height: 18px;
    background: #EFEFEF;
    text-align: center;
    color: #555;
    font-size: 12px;
    font-weight: bold;
    border: 1px solid #BDBDBD;
    border-radius: 3px;
  }

  .colpick_submit:hover {
    background: #F3F3F3;
    border-color: #999;
    cursor: pointer;
  }

  .colpick_full_ns .colpick_submit,
  .colpick_full_ns .colpick_current_color {
    display: none;
  }

  .colpick_full_ns .colpick_new_color {
    width: 130px;
    height: 25px;
  }

  .colpick_full_ns .colpick_rgb_r,
  .colpick_full_ns .colpick_hsb_h {
    top: 42px;
  }

  .colpick_full_ns .colpick_rgb_g,
  .colpick_full_ns .colpick_hsb_s {
    top: 73px;
  }

  .colpick_full_ns .colpick_rgb_b,
  .colpick_full_ns .colpick_hsb_b {
    top: 104px;
  }

  .colpick_full_ns .colpick_hex_field {
    top: 135px;
  }

  .colpick_rgbhex {
    width: 282px;
  }

  .colpick_rgbhex .colpick_hsb_h,
  .colpick_rgbhex .colpick_hsb_s,
  .colpick_rgbhex .colpick_hsb_b {
    display: none;
  }

  .colpick_rgbhex .colpick_field,
  .colpick_rgbhex .colpick_submit {
    width: 68px;
  }

  .colpick_rgbhex .colpick_new_color {
    width: 34px;
    border-right: none;
  }

  .colpick_rgbhex .colpick_current_color {
    width: 34px;
    left: 240px;
    border-left: none;
  }

  .colpick_rgbhex_ns .colpick_submit,
  .colpick_rgbhex_ns .colpick_current_color {
    display: none;
  }

  .colpick_rgbhex_ns .colpick_new_color {
    width: 68px;
    border: 1px solid #8F8F8F;
  }

  .colpick_rgbhex_ns .colpick_rgb_r {
    top: 42px;
  }

  .colpick_rgbhex_ns .colpick_rgb_g {
    top: 73px;
  }

  .colpick_rgbhex_ns .colpick_rgb_b {
    top: 104px;
  }

  .colpick_rgbhex_ns .colpick_hex_field {
    top: 135px;
  }

  .colpick_hex {
    width: 206px;
    height: 201px;
  }

  .colpick_hex .colpick_hsb_h,
  .colpick_hex .colpick_hsb_s,
  .colpick_hex .colpick_hsb_b,
  .colpick_hex .colpick_rgb_r,
  .colpick_hex .colpick_rgb_g,
  .colpick_hex .colpick_rgb_b {
    display: none;
  }

  .colpick_hex .colpick_hex_field {
    width: 72px;
    height: 25px;
    top: 168px;
    left: 80px;
  }

  .colpick_hex .colpick_hex_field div,
  .colpick_hex .colpick_hex_field input {
    height: 25px;
    line-height: 25px;
  }

  .colpick_hex .colpick_new_color,
  .colpick_hex .colpick_current_color,
  .colpick_hex .colpick_submit {
    top: 168px;
    width: 30px;
  }

  .colpick_hex .colpick_new_color {
    left: 9px;
    border-right: none;
  }

  .colpick_hex .colpick_current_color {
    left: 39px;
    border-left: none;
  }

  .colpick_hex .colpick_submit {
    left: 164px;
    height: 25px;
    line-height: 25px;
  }

  .colpick_hex_ns .colpick_submit,
  .colpick_hex_ns .colpick_current_color {
    display: none;
  }

  .colpick_hex_ns .colpick_hex_field {
    width: 80px;
  }

  .colpick_hex_ns .colpick_new_color {
    width: 60px;
    border: 1px solid #8F8F8F;
  }

  .colpick_dark {
    background: #161616;
    border-color: #2A2A2A;
  }

  .colpick_dark .colpick_color {
    outline-color: #333;
  }

  .colpick_dark .colpick_hue {
    border-color: #555;
  }

  .colpick_dark .colpick_field,
  .colpick_dark .colpick_hex_field {
    background: #101010;
    border-color: #2D2D2D;
  }

  .colpick_dark .colpick_field_letter {
    background: #131313;
    border-color: #2D2D2D;
    color: #696969;
  }

  .colpick_dark .colpick_field input,
  .colpick_dark .colpick_hex_field input {
    color: #7A7A7A;
  }

  .colpick_dark .colpick_field_uarr {
    border-bottom-color: #696969;
  }

  .colpick_dark .colpick_field_darr {
    border-top-color: #696969;
  }

  .colpick_dark .colpick_focus {
    border-color: #444;
  }

  .colpick_dark .colpick_submit {
    background: #131313;
    border-color: #2D2D2D;
    color: #7A7A7A;
  }

  .colpick_dark .colpick_submit:hover {
    background-color: #101010;
    border-color: #444;
  }

  /*Ghazal End*/

</style>
