<template>
  <div id="graph-viz">
    <link v-once rel="stylesheet" href="./static/fonts/font-awesome/css/font-awesome.css"/>
    <!-- <link v-once rel="stylesheet" href="./static/style.css" /> -->

    <nodeList v-bind:nodesOutside='nodesOutsideDiagram'
              @clickedNodeInList="addNode($event)"/>
    <toolBar @clickedAction="changeMouseState($event)"
             @mouseEnter="deleteRadial()"
             :mouse="this.mouseState"/>
    <photoshop-picker v-show="ifColorPickerOpen"
                      :style="styleObject"
                      :value="colors"
                      @input="updateFromPicker"
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
  import {Compact} from 'vue-color';
  import networkViz from 'networkvizjs';
  import Rx from 'rxjs/Rx';
  import nodeList from './components/nodeList';
  import toolBar from './components/toolBar';
  import linkTool from './behaviours/link-tool';
  import textEdit from './behaviours/text-edit';
  import Selection from './behaviours/selection';

  const ADDNOTE = 'ADDNOTE';
  const BOLD = 'BOLD';
  const CLEARHISTORY = 'CLEARHISTORY';
  const CLEARSCREEN = 'CLEARSCREEN';
  const COLOR = 'COLOR';
  const COPY = 'COPY';
  const CREATE = 'CREATE';
  const CREATEEDGE = 'CREATEEDGE';
  const DELETE = 'DELETE';
  const EDGEEDIT = 'EDGEEDIT';
  const IMAGE = 'IMAGE';
  const IMPORTPROB = 'IMPORTPROB';
  const ITALIC = 'ITALIC';
  const NODEEDIT = 'NODEEDIT';
  const PIN = 'PIN';
  const REDO = 'REDO';
  const REMOVEARROWS = 'REMOVEARROWS';
  const POINTER = 'POINTER';
  const SAVE = 'SAVE';
  const SELECT = 'SELECT';
  const SHAPE = 'SHAPE';
  const TEXT = 'TEXT';
  const TEXTEDIT = 'TEXTEDIT';
  const UNDERLINE = 'UNDERLINE';
  const UNDO = 'UNDO';
  const WIDTH = 'WIDTH';


  export default {
    props: ['hypothesisId', 'nodes', 'highlightedNodeId', 'savedDiagram', 'width', 'height', 'textNodes', 'imgDropGraph', 'getDlist'],
    name: 'graph-viz',
    components: {
      nodeList,
      toolBar,
      'photoshop-picker': Compact
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
          hex: '#FFFFFF',
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
        scale: 1,
        activeSelect: new Selection(),
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
            type: CREATE,
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
          let canvas, ctx, dataURL, base64;
          canvas = document.createElement('canvas');
          ctx = canvas.getContext('2d');
          const cw = canvas.width;
          const ch = canvas.height;
          const maxW = 150;
          const maxH = 100;
          const iw = img.width;
          const ih = img.height;
          const scale = Math.min((maxW / iw), (maxH / ih));
          const iwScaled = iw * scale;
          const ihScaled = ih * scale;
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
        const parts = img.getAttribute('src').split('/');
        const id = parts[parts.length - 1];

        const nodeImg = {
          src: base64,
          width: 60,
          height: 70,
          class: 'img-node'
        };
        if (current.dropped && current.dropped !== old.dropped) {
          if (!current.existingNode) {
            this.rootObservable.next({
              type: CREATE,
              newNode: {
                text: 'New',
                img: nodeImg
              },
            });
          } else {
            let node = null;
            const indexOfNode = me.textNodes.map(v => v.id).indexOf(current.existingNode.id);
            if (indexOfNode === -1) {
              return;
            }
            node = this.toNode(this.textNodes[indexOfNode]);
            node.img = {
              src: base64,
              width: 60,
              height: 70,
              class: 'img-node'
            };
            this.rootObservable.next({
              type: NODEEDIT,
              prop: IMAGE,
              value: node.img,
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
      async showLoadingMask(text) {
        const target = this.$el;
        const options = {
          target: target,
          text: text
        };
        target.style.opacity = '0.2';
        this.responseLoadingMask = this.$loading(options);
        return await this.$nextTick();
      },
      hideLoadingMask() {
        let me = this;
        if (me.responseLoadingMask) {
          me.responseLoadingMask.close();
        }
      },
      // onColorOk(ev) {
      //   this.ifColorPickerOpen = false;
      //   let newColor = '#FFFFFF';
      //   if (!this.colors) {
      //     return;
      //   }
      //   if (typeof this.colors === 'object') {
      //     newColor = this.colors.hex;
      //   } else if (typeof this.colors === 'string' && this.colors.startsWith('#')) {
      //     newColor = this.colors;
      //   }
      //   this.coloredEl[0].setAttribute('fill', newColor);
      //   this.rootObservable.next({
      //     type: NODEEDIT,
      //     prop: COLOR,
      //     value: newColor,
      //     id: this.coloredNode.id,
      //   });
      // },

      updateFromPicker(value) {
        this.ifColorPickerOpen = false;
        this.colors = value;
        this.rootObservable.next({
          type: NODEEDIT,
          prop: COLOR,
          value: value.hex,
          id: this.coloredNodeId,
        });
      },

      actions($action) {
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
                  if (nextAction.type === DELETE || nextAction.type === CREATE) {
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

              case CREATE: {
                let fixedWidthNodePresent = false;
                // create Nodes
                let nodes = [];
                // new nodes are nodes that have not been added to the graph yet
                if (action.newNode) {
                  const newNodes = Array.isArray(action.newNode) ? action.newNode : [action.newNode];
                  const newNodeArr = newNodes.map(n => {
                    const defaultNode = {
                      id: 'note-' + uuid.v4(),
                      class: 'b-no-snip',
                      nodeShape: 'capsule',
                      text: 'New',
                      img: false,
                      isSnip: false,
                      fixed: true,
                      color: '#ffffff',
                      fixedWidth: false,
                    };
                    const textNode = Object.assign({}, defaultNode, n);
                    const indexOfNode = this.textNodes.map(v => v.id).indexOf(textNode.id);
                    if (indexOfNode === -1) this.textNodes.push(textNode);
                    this.addNodeHelper(textNode.id);
                    this.notes += 1;
                    this.noteObjs = [...this.noteObjs, textNode];
                    this.resetTools();
                    if (textNode.fixedWidth) {
                      fixedWidthNodePresent = true;
                    }
                    return textNode;
                  });
                  nodes = nodes.concat(newNodeArr);
                }
                // existing nodes are nodes that are being re added after being deleted.
                if (action.existingNode) {
                  const newNodes = Array.isArray(action.existingNode) ? action.existingNode : [action.existingNode];
                  newNodes.forEach(n => {
                    this.graph.addNode(this.toNode(n));
                    this.recalculateNodesOutside();
                    if (n.fixedWidth) {
                      fixedWidthNodePresent = true;
                    }
                  });
                  nodes = nodes.concat(newNodes);
                }

                // add edges
                let triplet;
                if (action.triplet) {
                  triplet = Array.isArray(action.triplet) ? action.triplet : [action.triplet];
                } else {
                  triplet = [];
                }
                Promise.all(triplet.map(t => this.graph.addTriplet(t)))
                // add to undo stack
                  .then(() => {
                    undoStack.push({
                      type: DELETE,
                      nodeId: nodes.map(n => n.id),
                      triplet: triplet,
                    });
                  })
                  // perform callbacks
                  .then(() => {
                    if (action.callback) {
                      action.callback();
                    }
                  })
                  .catch((err) => {
                    console.log(err);
                  });

                // TODO fixed width nodes on addition size incorrectly. 2nd restart required
                if (fixedWidthNodePresent) {
                  this.graph.restart.layout();
                }
                break;
              }

              case DELETE: {
                // get all edges attached to node
                const db = this.graph.getDB();
                let nodeIds;
                let edgeArray;
                if (action.nodeId) {
                  nodeIds = Array.isArray(action.nodeId) ? action.nodeId : [action.nodeId];
                } else {
                  nodeIds = [];
                }
                if (action.triplet) {
                  edgeArray = Array.isArray(action.triplet) ? action.triplet : [action.triplet];
                } else {
                  edgeArray = [];
                }
                const nodeArray = nodeIds.map(id => this.graph.getNode(id));
                // promise containing all subject edges form DB
                const subjectEdges = nodeIds.map(id => {
                  return new Promise((resolve, reject) => {
                    db.get({ subject: id }, (err, l) => {
                      if (err) {
                        reject(err);
                      } else {
                        resolve(l);
                      }
                    });
                  });
                });
                // promise containing all object edges from DB
                const objectEdges = nodeIds.map(id => {
                  return new Promise((resolve, reject) => {
                    db.get({ object: id }, (err, l) => {
                      if (err) {
                        reject(err);
                      } else {
                        resolve(l);
                      }
                    });
                  });
                });
                // promise containing edges selected for deletion
                const edgePromise = edgeArray.map(triplet => {
                  triplet.subject = triplet.subject.id;
                  triplet.object = triplet.object.id;
                  return Promise.resolve(triplet);
                });

                Promise.all([...subjectEdges, ...objectEdges, ...edgePromise])
                //map database triplets to edge objects
                  .then((values) => {
                    return [].concat.apply([], values)
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
                  })
                  //remove duplicate edges
                  .then((edges) => {
                    const edgeMap = new Map();
                    edges.forEach((edge) => {
                      edgeMap.set(edge.predicate.hash, edge);
                    });
                    return [...edgeMap.values()];
                  })
                  // delete all edges
                  .then((edges) => {
                    return Promise.all(edges.map(t => this.graph.removeTriplet(t)))
                    // delete all nodes
                      .then(() => {
                        nodeIds.forEach(id => this.graph.removeNode(id, this.recalculateNodesOutside));
                      })
                      // add to undo stack
                      .then(() => {
                        undoStack.push({
                          type: CREATE,
                          triplet: edges,
                          existingNode: nodeArray,
                        });
                      });
                  })
                  // perform callbacks
                  .then(() => {
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
                  case IMAGE: {
                    textNodesEditHelper('img');
                    this.graph.editNode({
                      property: 'img',
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
            // 1st bit is user set, second bit is set by d3 whilst dragging. hence check LSB if d.fixed is not bool
            return (d.fixed === true || d.fixed % 2 === 1);
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

          nodeShape: 'capsule',

          // Shapes defined: rect, circle, capsule
          nodePath: (d) => {
            switch (d.nodeShape) {
              case 'rect': {
                return 'M16 48 L48 48 L48 16 L16 16 Z';
              }
              case 'circle': {
                return 'M20,40a20,20 0 1,0 40,0a20,20 0 1,0 -40,0';
              }
              // case 'capsule': {
              //   const X = 37;
              //   const Y = -13;
              //   const p1x = 25 + X;
              //   const p1y = 25 + Y;
              //   const p2x = 75 + X;
              //   const p3x = 100 + X;
              //   const p4y = 50 + Y;
              //   return `M ${p1x} ${p1y} L ${p2x} ${p1y} C ${p3x} ${p1y} ${p3x} ${p4y} ${p2x} ${p4y} L ${p1x} ${p4y} C ${X} ${p4y} ${X} ${p1y} ${p1x} ${p1y} `;
              // }
              case 'capsule': {
                const width = d.width;
                const height = d.height;
                if (width && height) {
                  const x = width / 2;
                  const y = height / 2;
                  const r = Math.round(Math.min(width, height) / 8);
                  const v0 = { x: x, y: y };
                  const v1 = { x: x, y: y + height };
                  const v2 = { x: x + width, y: y + height };
                  const v3 = { x: x + width, y: y };
                  return [`M${v0.x} ${v0.y + r}`,
                    `V${v1.y - r}`,
                    `C${v1.x} ${v1.y} ${v1.x + r} ${v1.y} ${v1.x + r} ${v1.y}`,
                    `H${v2.x - r}`,
                    `C${v2.x} ${v2.y} ${v2.x} ${v2.y - r} ${v2.x} ${v2.y - r}`,
                    `V${v3.y + r}`,
                    `C${v3.x} ${v3.y} ${v3.x - r} ${v3.y} ${v3.x - r} ${v3.y}`,
                    `H${v0.x + r}`,
                    `C${v0.x} ${v0.y} ${v0.x} ${v0.y + r} ${v0.x} ${v0.y + r} Z`]
                    .join(' ');
                } else {
                  return 'M16 20 V44 C16 48 20 48 20 48 H44 C48 48 48 44 48 44 V20 C48 16 44 16 44 16 H20 C16 16 16 20 16 20 Z';
                }


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
            this.scale = scale;
          },

          mouseOverBrush: (ev, element, node) => {
            me.dbClickCreateNode = false;
            me.ifColorPickerOpen = true;
            me.coloredEl = element._groups[0];
            me.coloredNodeId = node.id;
            me.colors = node.color;
            me.$refs.vueColorPicker.currentColor = node.color;

            let grapgEditor = document.getElementById('graph').getBoundingClientRect();
            let graphEditorX = grapgEditor.x;
            let graphEditorY = grapgEditor.y;
            let graphEditorW = grapgEditor.width;
            let graphEditorH = grapgEditor.height;
            let posX = ev.clientX - graphEditorX;
            let posY = ev.clientY + 30;

            if (posX + 250 > graphEditorW) {
              posX = posX - 250;
            }
            if (posY < 0) {
              posY = 0;
            }
            if (posY + 70 > graphEditorH) {
              posY = posY - (posY + 80 - graphEditorH);
            }
            this.styleObject = {
              position: 'absolute !important',
              top: posY + 'px !important',
              left: posX + 'px !important',
              'z-index': '9999'
            };
            const svgElem = this.graph.getSVGElement().node();
            Rx.Observable.fromEvent(svgElem, 'click')
              .takeWhile(() => this.ifColorPickerOpen === true)
              .take(1)
              .do(e => e.stopPropagation())
              .do(e => e.preventDefault())
              .subscribe(() => {
                this.ifColorPickerOpen = false;
              });
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
            this.activeSelect.deselect(node);
            this.rootObservable.next({
              type: DELETE,
              nodeId: node.id,
            });
          },

          edgeRemove: (edge) => {
            this.rootObservable.next({
              type: DELETE,
              triplet: edge,
            });
          },

          imgResize: (bool) => {
            this.isResizing = bool;
          },

          resizeDrag: (node, selection, event) => {
            if (this.mouseState === TEXTEDIT) {
              return;
            }
            this.changeMouseState(POINTER);
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
                const img = selection.node().parentNode.querySelector('image');
                const imgWidth = img ? img.getBBox().width : 0;
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

          isSelect: () => {
            return this.$data.mouseState === SELECT;
          },
        });


        /**
         Edge link tool
         **/
        this.linkTool = linkTool(this.graph, $mousedown, $mouseOverNode, this.toNode, (tripletObject) => {
          this.rootObservable.next({
            type: CREATE,
            triplet: tripletObject,
          });
        }, () => {
          this.changeMouseState(POINTER);
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
          this.changeMouseState(POINTER);
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
          type: CREATE,
          newNode: coords,
        });
      },

      resetTools() {
        this.linkToolDispose();
        this.linkToolDispose = this.linkTool([...this.textNodes, ...this.noteObjs]);
      },

      recalculateNodesOutside() {
        this.nodesOutsideDiagram = this.textNodes.filter((v) => {
          return !this.graph.hasNode(`${v.id}`);
        });
      },

      changeMouseState(state) {
        if (!(state === ADDNOTE
          || state === BOLD
          || state === CLEARSCREEN
          || state === COPY
          || state === COLOR
          || state === DELETE
          || state === IMPORTPROB
          || state === ITALIC
          || state === PIN
          || state === POINTER
          || state === REDO
          || state === REMOVEARROWS
          || state === SAVE
          || state === SELECT
          || state === UNDERLINE
          || state === UNDO)) {
          console.error('Not sure what state', state, 'is');
        } else {
          this.mouseState = state;
        }
        switch (state) {

          case ADDNOTE: {
            this.changeMouseState(POINTER);
            this.rootObservable.next({
              type: CREATE,
              newNode: true,
            });
            break;
          }

          case BOLD: {
            this.mouseState = SELECT;
            const nodes = [...this.activeSelect.nodes.values()];
            if (nodes.length === 0) break;
            const reCheckBold = /^ *(<.*>)*(<b>)(.*)(<\/b>)(<\/.*>)* *$/;
            const bold = nodes.every((d) => reCheckBold.test(d.shortname));
            const values = nodes.map(d => {
              // remove existing bold tags
              let str = d.shortname.replace(/<b>|<\/b>/g, '');
              if (!bold) {
                // add bold tags to outside of string
                str = '<b>' + str + '</b>';
              }
              return str;
            });
            this.rootObservable.next({
              type: NODEEDIT,
              prop: TEXT,
              id: [...this.activeSelect.nodes.keys()],
              value: values,
            });
            break;
          }

          case CLEARSCREEN: {
            this.changeMouseState(POINTER);
            this.clearScreen();
            this.rootObservable.next({ type: CLEARHISTORY });
            break;
          }

          case COLOR: {
            this.mouseState = SELECT;
            this.dbClickCreateNode = false;
            this.ifColorPickerOpen = true;
            this.coloredNodeId = [...this.activeSelect.nodes.keys()];
            this.colors = '#FFFFFF';
            this.styleObject = {
              position: 'absolute !important',
              top: 70 + 'px !important',
              right: 95 + 'px !important',
              'z-index': '9999'
            };
            const svgElem = this.graph.getSVGElement().node();
            Rx.Observable.fromEvent(svgElem, 'click')
              .takeWhile(() => this.ifColorPickerOpen === true)
              .take(1)
              .do(e => e.stopPropagation())
              .do(e => e.preventDefault())
              .subscribe(() => {
                this.ifColorPickerOpen = false;
              });
            break;
          }

          case COPY: {
            this.mouseState = SELECT;
            if (this.activeSelect.nodes.size === 0) break;
            this.rootObservable.next({
              type: CREATE,
              newNode: [...this.activeSelect.nodes.values()].map(d => {
                const { color, fixed, fixedWidth, img, isSnip, nodeShape, shortname } = d;
                return {
                  color,
                  fixed,
                  fixedWidth,
                  img,
                  isSnip,
                  nodeShape,
                  shortname,
                  class: d.class.replace(' highlight', ''),
                };
              })
            });
            break;
          }

          case DELETE: {
            const nodes = [...this.activeSelect.nodes.keys()];
            if (this.activeSelect.size === 0) break;
            this.changeMouseState(POINTER);
            this.activeSelect.clear();
            this.rootObservable.next({
              type: DELETE,
              nodeId: nodes,
            });
            break;
          }

          case IMPORTPROB: {
            this.changeMouseState(POINTER);
            // test case
            // const Dlist = { X: new Set(), Y: new Set('X'), Z: new Set('X'), A: new Set('B'), B: new Set() };
            const Dlist = this.getDlist && this.getDlist();
            if (!Dlist || Object.keys(Dlist).length === 0) return;
            const objOfNodes = {};
            const listOfEdges = [];
            Object.keys(Dlist).forEach((D) => {
              const id = 'note-' + uuid.v4();
              objOfNodes[D] = {
                id: id,
                nodeShape: 'circle',
                text: D,
                fixed: false,
                hash: id,
              };
            });

            Object.entries(Dlist).forEach(([key, val]) => {
              val.forEach((n) => {
                listOfEdges.push({
                  subject: objOfNodes[n],
                  predicate: {
                    type: 'arrow',
                    text: '',
                    hash: 'edge-' + uuid.v4(),
                    subject: objOfNodes[n].id,
                    object: objOfNodes[key].id,
                    constraint: {
                      axis: 'y',
                      type: 'separation',
                      leftID: objOfNodes[n].id,
                      rightID: objOfNodes[key].id,
                      gap: 170,
                    },
                  },
                  object: objOfNodes[key],
                });
              });
            });

            this.rootObservable.next({
              type: CREATE,
              newNode: Object.values(objOfNodes),
              triplet: listOfEdges,
              callback: this.graph.restart.handleDisconnects,
            });
            break;
          }

          case ITALIC: {
            this.mouseState = SELECT;
            const nodes = [...this.activeSelect.nodes.values()];
            if (nodes.length === 0) break;
            const reCheckItalic = /^ *(<.*>)*(<i>)(.*)(<\/i>)(<\/.*>)* *$/;
            const italic = nodes.every((d) => reCheckItalic.test(d.shortname));
            const values = nodes.map(d => {
              let str = d.shortname.replace(/<i>|<\/i>/g, ''); // remove existing italic tags
              if (!italic) {
                str = '<i>' + str + '</i>';// add italic tags to outside of string
              }
              return str;
            });
            this.rootObservable.next({
              type: NODEEDIT,
              prop: TEXT,
              id: [...this.activeSelect.nodes.keys()],
              value: values,
            });
            break;
          }

          case PIN: {
            this.mouseState = SELECT;
            if (this.activeSelect.nodes.size === 0) break;
            this.rootObservable.next({
              type: NODEEDIT,
              prop: PIN,
              id: [...this.activeSelect.nodes.keys()],
              value: [...this.activeSelect.nodes.values()].map(d => !d.fixed),
            });
            break;
          }

          case POINTER: {
            this.activeSelect.clear();
            this.graph.restart.styles();
            break;
          }

          case REDO: {
            this.changeMouseState(POINTER);
            this.rootObservable.next({ type: REDO });
            break;
          }

          case REMOVEARROWS: {
            this.changeMouseState(POINTER);
            const db = this.graph.getDB();
            db.get({}, (err, l) => {
              if (err) {
                console.error(err);
              }
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
                type: DELETE,
                triplet: triplets,
              });
            });
            break;
          }

          case SAVE: {
            this.changeMouseState(POINTER);
            this.deleteRadial();

            const text = 'Saving Graph...';
            this.showLoadingMask(text);

            setTimeout(() => {
              this.graph.saveGraph((savedData) => {
                this.$emit('save', savedData, this.graph.getSVGElement().node(), this.textNodes);
              });
            }, 50);
            break;
          }

          case SELECT: {
            const svg = this.graph.getSVGElement();
            Rx.Observable.fromEvent(svg.node(), 'mousedown')
              .takeWhile(() => this.mouseState === SELECT)
              .do(e => e.preventDefault())
              .do(e => e.stopPropagation())
              .map(e => ({ ...this.transformCoordinates({ x: e.x, y: e.y }), shift: e.shiftKey, alt: e.altKey }))
              .map(({ x, y, shift, alt }) => {
                if (!shift && !alt) {
                  this.activeSelect.clear();
                }
                return { x, y, addTo: !alt };
              })
              .map(({ x, y, addTo }) => {
                const g = svg.select('.svg-graph');
                const elem = g.append('path')
                  .attr('id', 'selector')
                  .attr('d', `M${x} ${y} H${x} V${y} H${x}Z`)
                  .attr('style', 'stroke:rgba(129, 179, 254);stroke-width:1')
                  .attr('shape-rendering', 'crispEdges')
                  .attr('fill', 'rgba(0, 110, 251, 0.1)')
                  .attr('stroke-dasharray', '4 3');
                return { x, y, addTo, elem };
              })
              .subscribe(({ x, y, addTo, elem }) => {
                Rx.Observable.fromEvent(document, 'mousemove')
                  .do(e => e.preventDefault())
                  .do(e => e.stopPropagation())
                  .map(e => this.transformCoordinates({ x: e.x, y: e.y }))
                  .map(e => ({ X: e.x, Y: e.y }))
                  .map(({ X, Y }) => {
                    elem.attr('d', `M${x} ${y} H${X} V${Y} H${x}Z`);
                    return this.graph.selectByCoords({ x, X, y, Y });
                  })
                  .pairwise()
                  .takeUntil(Rx.Observable.fromEvent(document, 'mouseup'))
                  .finally(() => {
                    elem.remove();
                  })
                  .subscribe(([oldSelect, currentSelect]) => {
                    if (addTo) {
                      this.activeSelect.deselect(oldSelect);
                      this.activeSelect.select(currentSelect);
                    } else {
                      this.activeSelect.select(oldSelect);
                      this.activeSelect.deselect(currentSelect);
                    }
                    this.graph.restart.styles();
                  });
              });

            Rx.Observable.fromEvent(svg.node(), 'click')
              .takeWhile(() => this.mouseState === SELECT)
              .do(e => e.preventDefault())
              .do(e => e.stopPropagation())
              .map(e => ({ ...this.transformCoordinates({ x: e.x, y: e.y }), shift: e.shiftKey }))
              .map(({ x, y, shift }) => {
                if (!shift) {
                  this.activeSelect.clear();
                }
                return { x, y };
              })
              .subscribe(({ x, y }) => {
                const newSelect = this.graph.selectByCoords({ x, X: x, y, Y: y });
                this.activeSelect.selectExclusive(newSelect);
                this.graph.restart.styles();
              });

            /** DEFINE KEYBOARD SHORTCUTS FOR SELECT TOOL **/
            const keyDown = Rx.Observable.fromEvent(document, 'keydown')
              .takeWhile(() => this.mouseState === SELECT);

            const ctrl = keyDown.filter(e => (e.ctrlKey && !e.shiftKey && !e.altKey));

            keyDown.subscribe(e => console.log(e));

            // ESC clear selection
            keyDown.filter(e => e.keyCode === 27)
              .do(e => e.preventDefault())
              .subscribe(() => {
                this.activeSelect.clear();
                this.graph.restart.styles();
              });

            // DEL delete
            keyDown.filter(e => e.keyCode === 46)
              .do(e => e.preventDefault())
              .subscribe(() => {
                this.changeMouseState(DELETE);
              });

            // ctrl + C duplicate
            ctrl.filter(e => e.keyCode === 67)
              .do(e => e.preventDefault())
              .subscribe(() => {
                this.changeMouseState(COPY);
              });

            // ctrl + U underline
            ctrl.filter(e => e.keyCode === 85)
              .do(e => e.preventDefault())
              .subscribe(() => {
                this.changeMouseState(UNDERLINE);
              });
            // ctrl + B underline
            ctrl.filter(e => e.keyCode === 66)
              .do(e => e.preventDefault())
              .subscribe(() => {
                this.changeMouseState(BOLD);
              });
            // ctrl + U underline
            ctrl.filter(e => e.keyCode === 73)
              .do(e => e.preventDefault())
              .subscribe(() => {
                this.changeMouseState(ITALIC);
              });

            // ctrl + A select all
            ctrl.filter(e => e.keyCode === 65)
              .subscribe(() => {
                const newSelect = this.graph.selectByCoords({
                  x: -Infinity,
                  X: Infinity,
                  y: -Infinity,
                  Y: Infinity
                });
                this.activeSelect.select(newSelect);
                this.graph.restart.styles();
              });
            break;
          }

          case UNDERLINE: {
            this.mouseState = SELECT;
            const nodes = [...this.activeSelect.nodes.values()];
            if (nodes.length === 0) break;
            const reCheckUnderlined = /^ *(<.*>)*(<u>)(.*)(<\/u>)(<\/.*>)* *$/;
            const underline = nodes.every((d) => reCheckUnderlined.test(d.shortname));
            const values = nodes.map(d => {
              // remove existing underlines
              // let str = d.shortname.replace(/^ *(<.*>)*(<u>)(.*)(<\/u>)(<\/.*>)* *$/, '$1$3$5');
              let str = d.shortname.replace(/<u>|<\/u>/g, '');
              if (!underline) {
                // add underline tags inside other tegs
                str = str.replace(/ *^((<[^<>]*>)*)(.*?)((<\/[^<>]*>)*)$ */, '$1<u>$3</u>$4');
              }
              return str;
            });
            this.rootObservable.next({
              type: NODEEDIT,
              prop: TEXT,
              id: [...this.activeSelect.nodes.keys()],
              value: values,
            });
            break;
          }

          case UNDO: {
            this.changeMouseState(POINTER);
            this.rootObservable.next({ type: UNDO });
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

  .vc-compact {
    width: 245px !important;
    box-sizing: border-box;
  }

  .highlight {
    stroke: rgb(129, 179, 254);
  }

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
