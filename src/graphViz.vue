<template>
  <div id="graph-viz">
    <link v-once rel="stylesheet" href="./static/fonts/font-awesome/css/font-awesome.css"/>

    <hover-menu-node :position="hoverPos"
                     :pad="10"
                     :color="hoverColor"
                     :display="hoverDisplay"
                     :fixed="hoverFixed"
                     :shape="hoverShape"
                     :data="hoverData"
                     :type="hoverType"
                     @exitHover="closeHoverMenu($event)"
                     @clickedButton="hoverInteract($event)">
    </hover-menu-node>
    <hover-menu-edge :position="hoverEdgePos"
                     :pad="10"
                     :color="hoverEdgeColor"
                     :display="hoverEdgeDisplay"
                     :data="hoverEdgeData"
                     :type="hoverEdgeType"
                     @exitHover="closeEdgeHoverMenu($event)"
                     @clickedButton="hoverEdgeInteract($event)">
    </hover-menu-edge>
    <toolBar @clickedAction="changeMouseState($event)"
             @mouseEnter="closeHoverMenu()"
             :mouse="mouseState"/>
    <color-picker v-show="ifColorPickerOpen"
                  :style="styleObject"
                  :value="colors"
                  :palette="palette"
                  @input="updateFromPicker"
                  ref="vueColorPicker">
    </color-picker>
    <div id="graph" v-on:dblclick="dblClickOnPage"></div>

  </div>
</template>

<script>
  /**
   Event emitters:
   - mouseovernode, nodeId - String
   - mouseoutnode, void
   */
  import uuid from 'uuid/v4';
  import {Compact} from 'vue-color';
  import networkViz from 'networkvizjs';
  import {Subject, merge, fromEvent, combineLatest, of, interval} from 'rxjs';
  import {
    map,
    filter,
    debounceTime,
    finalize,
    tap,
    take,
    takeUntil,
    takeLast,
    takeWhile,
    pairwise
  } from 'rxjs/operators';
  import toolBar from './components/toolBar';
  import hoverMenuNode from './components/hoverMenuNode';
  import hoverMenuEdge from './components/hoverMenuEdge';
  import linkTool from './behaviours/link-tool';
  import textEdit from './behaviours/text-edit';
  import HighlightSelection from './behaviours/selection';


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
  const GROUP = 'GROUP';
  const GROUPDRAG = 'GROUPDRAG';
  const GROUPEDIT = 'GROUPEDIT';
  const IMAGE = 'IMAGE';
  const IMPORTPROB = 'IMPORTPROB';
  const ITALIC = 'ITALIC';
  const NODEEDIT = 'NODEEDIT';
  const NODERESIZE = 'NODERESIZE';
  const OPEN = 'OPEN';
  const PIN = 'PIN';
  const REDO = 'REDO';
  const REMOVEARROWS = 'REMOVEARROWS';
  const POINTER = 'POINTER';
  const SAVE = 'SAVE';
  const SELECT = 'SELECT';
  const SHAPE = 'SHAPE';
  const WEIGHT = 'WEIGHT';
  const DASH = 'DASH';
  const TEXT = 'TEXT';
  const TEXTEDIT = 'TEXTEDIT';
  const UNDERLINE = 'UNDERLINE';
  const UNDO = 'UNDO';
  const WIDTH = 'WIDTH';
  const POS = 'POS';

  const palette = [
          '#4D4D4D', '#999999', '#FFFFFF', '#F44E3B', '#FE9200', '#F6ECAF', '#DBDF00', '#A4DD00', '#AADCDC', '#73D8FF', '#AEA1FF', '#FDA1FF',
          '#333333', '#808080', '#CCCCCC', '#D33115', '#E27300', '#FCDC00', '#B0BC00', '#68BC00', '#16A5A5', '#009CE0', '#7B64FF', '#FA28FF',
          '#000000', '#666666', '#B3B3B3', '#9F0500', '#C45100', '#FCC400', '#808900', '#194D33', '#0C797D', '#0062B1', '#653294', '#AB149E'
        ];
  
  export default {
    props: {
      hypothesisId: String,
      nodes: {
        type: Array,
        default: function () {
          return [];
        }
      },
      highlightedNodeId: null,
      savedDiagram: null,
      width: Number,
      height: Number,
      textNodes: {
        type: Array,
        default: function () {
          return [];
        }
      },
      imgDropGraph: null,
      getDlist: Function,
    },
    name: 'graph-viz',
    components: {
      toolBar,
      'color-picker': Compact,
      hoverMenuNode,
      hoverMenuEdge
    },
    data() {
      return {
        ifColorPickerOpen: false,
        coloredNodeId: undefined,
        updateValue: null,
        styleObject: {
          top: '230px',
          left: '230px',
          position: 'absolute'
        },
        hoverDisplay: false,
        hoverPos: undefined,
        hoverColor: undefined,
        hoverFixed: undefined,
        hoverData: undefined,
        hoverShape: undefined,
        hoverType: undefined,
        hoverAwait: false,
        hoverQueue$: undefined,
        hoverEdgeDisplay: false,
        hoverEdgePos: undefined,
        hoverEdgeColor: undefined,
        hoverEdgeData: undefined,
        hoverEdgeType: undefined,
        colors: {
          hex: '#FFFFFF',
        },
        palette: palette,
        graph: undefined,
        nodesOutsideDiagram: [],
        mouseState: POINTER,
        linkTool: undefined,
        linkToolDispose: undefined, // Subscription disposing.
        notes: 0,
        noteObjs: [],
        dbClickCreateNode: true, // TODO remove this after removing edge menu
        canKeyboardUndo: true,
        groupDrag: false,
        destroy$: new Subject(),
        rootObservable: undefined,
        mouseDown$: undefined,
        mouseOverNode$: undefined,
        scale: 1,
        activeSelect: new HighlightSelection(),
        mouseStateObs$: undefined,
      };
    },
    mounted() {
      this.rootObservable = new Subject().pipe(takeUntil(this.destroy$));
      this.mouseDown$ = new Subject().pipe(takeUntil(this.destroy$));
      this.mouseOverNode$ = new Subject().pipe(takeUntil(this.destroy$));
      this.mouseStateObs$ = new Subject().pipe(takeUntil(this.destroy$));

      this.hoverQueue$ = new Subject().pipe(
        takeUntil(this.destroy$),
        debounceTime(100)
      );

      this.hoverQueue$.subscribe(callback => {
        if (callback && typeof (callback) === 'function') {
          callback();
        }
      });

      this.createGraph().then(() => {
        // Create initial diagram from createDiagram.
        if (this.savedDiagram) {
          // Create from saved.
          const savedGraph = JSON.parse(this.savedDiagram);
          this.loadFromSaved(savedGraph);

        }
      });

      this.actions(this.rootObservable);

      const svg = this.graph.getSVGElement().node();
      fromEvent(svg, 'focus').pipe(takeUntil(this.destroy$))
        .subscribe(() => {
        });

      fromEvent(document, 'paste')
        .pipe(
          takeUntil(this.destroy$),
          filter(() => this.clickedGraphViz),
          filter(() => !this.ifColorPickerOpen),
          filter(() => this.mouseState === POINTER || this.mouseState === SELECT),
          filter(() => document.activeElement === svg))
        .subscribe((e) => {
          this.changeMouseState(POINTER);
          this.rootObservable.next({
            type: CREATE,
            newNode: { text: e.clipboardData.getData('text/plain') },
          });
        });

      const keyDown = fromEvent(svg, 'keydown').pipe(takeUntil(this.destroy$));
      const ctrlDown = keyDown.pipe(filter(e => e.ctrlKey || e.metaKey));

      // undo keyboard shortcut
      ctrlDown.pipe(
        filter(e => e.keyCode === 90 && !e.shiftKey && !e.altKey),
        filter(() => this.canKeyboardUndo)
      ).subscribe((e) => {
        e.preventDefault();
        this.rootObservable.next({ type: UNDO });
      });

      // redo keyboard shortcut
      ctrlDown.pipe(
        filter(e => (e.keyCode === 89 && !e.shiftKey && !e.altKey) || (e.keyCode === 90 && e.shiftKey && !e.altKey)),
        filter(() => this.canKeyboardUndo)
      ).subscribe((e) => {
        e.preventDefault();
        this.rootObservable.next({ type: REDO });
      });

      // save file keyboard shortcut
      ctrlDown.pipe(
        filter(e => e.keyCode === 83),
        filter(() => this.mouseState === POINTER || this.mouseState === SELECT)
      ).subscribe((e) => {
        e.preventDefault();
        this.changeMouseState(SAVE);
      });

      // open file keyboard shortcut
      ctrlDown.pipe(
        filter(e => e.keyCode === 79),
        filter(() => this.mouseState === POINTER || this.mouseState === SELECT)
      ).subscribe((e) => {
        e.preventDefault();
        this.changeMouseState(OPEN);
      });

      // ctrl + A select all keyboard shortcut
      ctrlDown.pipe(filter(e => e.keyCode === 65),
        filter(() => this.mouseState === POINTER || this.mouseState === SELECT),
        tap(e => e.preventDefault())
      ).subscribe(() => {
        const newSelect = this.graph.selectByCoords({
          x: -Infinity,
          X: Infinity,
          y: -Infinity,
          Y: Infinity
        });
        if (this.mouseState !== SELECT) {
          this.changeMouseState(SELECT);
        }
        this.activeSelect.select(newSelect.nodes);
        this.activeSelect.select(newSelect.edges);
        this.graph.restart.styles();
      });

      // keyboard shortcuts to switch mouse tool
      keyDown.pipe(filter(e => (e.keyCode === 80 && this.mouseState === SELECT && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey)))
        .subscribe((e) => {
          e.preventDefault();
          this.changeMouseState(POINTER);
        });
      keyDown.pipe(filter(e => (e.keyCode === 83 && this.mouseState === POINTER && !e.ctrlKey && !e.metaKey && !e.shiftKey && !e.altKey)))
        .subscribe((e) => {
          e.preventDefault();
          this.changeMouseState(SELECT);
        });


    },
    beforeDestroy() {
      this.destroy$.next(true);
      this.destroy$.unsubscribe();
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

      createFromSave(save, textNodes) {
        // Create from saved.
        const savedGraph = save;
        const nodes = savedGraph.nodes;

        nodes.forEach((v) => {
          // Append x and y co-ordinates to the nodes passed in.
          this.addNodeHelper(v.hash, v.x, v.y);
        });
        const triplets = savedGraph.triplets;
        triplets.forEach((x) => {
          // Create the triplets between the nodes.
          const indexOfSubject = textNodes.map(v => v && v.id).indexOf(x.subject);
          const indexOfObject = textNodes.map(v => v && v.id).indexOf(x.object);
          if (indexOfSubject === -1 || indexOfObject === -1) {
            return;
          }
          // Create the triplet
          this.graph.addTriplet({
            subject: this.toNode(textNodes[indexOfSubject]),
            object: this.toNode(textNodes[indexOfObject]),
            predicate: x.predicate,
          });
        });
        //create groups
        const groups = savedGraph.groups;
        if (groups) {
          groups.forEach((g) => {
            this.graph.addToGroup({ id: g.id, data: g.data }, g.nodes, g.groups);
          });
        }
      },

      updateFromPicker(value) {
        const svg = this.graph.getSVGElement().node();
        svg.focus();
        this.ifColorPickerOpen = false;
        this.colors = value;
        this.hoverEdgeColor = value.hex;
        const idArray = Array.isArray(this.coloredNodeId) ? this.coloredNodeId : [this.coloredNodeId];
        if (idArray[0].slice(0, 4) === 'grup') {
          this.rootObservable.next({
            type: GROUPEDIT,
            prop: 'color',
            value: value.hex,
            id: idArray,
          });
        }
        if (idArray[0].slice(0, 4) === 'note') {
          this.rootObservable.next({
            type: NODEEDIT,
            prop: COLOR,
            value: value.hex,
            id: idArray,
          });
        }
        if (idArray[0].slice(0, 4) === "edge") {
          this.rootObservable.next({
            type: EDGEEDIT,
            prop: COLOR,
            value: value.hex,
            hash: idArray,
          })
        }
      },

      actions($action) {
        let undoStack = [];
        let redoStack = [];

        $action.pipe(
          tap((action) => {
            if (!(action.type === UNDO || action.type === REDO)) {
              redoStack = [];
            }
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
                      id: 'note-' + uuid(),
                      class: 'b-no-snip',
                      nodeShape: 'capsule',
                      text: 'New',
                      img: false,
                      isSnip: false,
                      fixed: true,
                      color: '#aadcdc',
                      fixedWidth: false,
                    };
                    const textNode = Object.assign({}, defaultNode, n);
                    const indexOfNode = this.textNodes.map(v => v.id).indexOf(textNode.id);
                    if (indexOfNode === -1) this.textNodes.push(textNode);
                    this.addNodeHelper(textNode.id, undefined, undefined, true);
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
                    this.graph.addNode(this.toNode(n), true);
                    this.recalculateNodesOutside();
                    if (n.fixedWidth) {
                      fixedWidthNodePresent = true;
                    }
                  });
                  nodes = nodes.concat(newNodes);
                }

                if (action.groups) {
                  const groups = [...action.groups.entries()];
                  groups.forEach(g => {
                    const id = g[0];
                    const saved = g[1];
                    this.graph.addToGroup({ id, data: saved.data }, saved.children, true);
                  });
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
                this.graph.restart.layout();
                // TODO fixed width nodes on addition size incorrectly. 2nd restart required
                if (fixedWidthNodePresent) {
                  this.graph.restart.layout();
                }
                break;
              }

              case DELETE: {
                this.closeHoverMenu();
                this.closeEdgeHoverMenu();
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

                // get groups they belong to
                const groupMap = new Map();
                nodeArray.forEach(d => {
                  if (d.parent) {
                    const g = d.parent;
                    if (groupMap.has(g.id)) {
                      groupMap.get(g.id).children.nodes.push(d.id);
                    } else {
                      groupMap.set(g.id, { data: g.data, children: { nodes: [d.id] } });
                    }
                  }
                });
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
                  triplet.subject = triplet.predicate.subject;
                  triplet.object = triplet.predicate.object;
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
                          groups: groupMap,
                        });
                      });
                  })
                  // perform callbacks
                  .then(() => {
                    this.graph.restart.layout();
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
                  case WEIGHT: {
                    oldValues = predicates.map(p => p.strokeWidth);
                    this.graph.editEdge({
                      property: 'weight',
                      id: idArray,
                      value: values,
                    });
                    this.graph.restart.styles();
                    break;
                  }
                  case DASH: {
                    oldValues = predicates.map(p => p.strokeDasharray);
                    this.graph.editEdge({
                      property: 'dash',
                      id: idArray,
                      value: values,
                    });
                    this.graph.restart.styles();
                    break;
                  }
                  case COLOR: {
                    oldValues = predicates.map(p => p.stroke);
                    this.graph.editEdge({
                      property: 'color',
                      id: idArray,
                      value: values,
                    });
                    this.graph.restart.styles();
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

              /**
               * Create new groups, move nodes between groups, or remove nodes from groups.
               *
               * create new group
               * Passing an array of children will create new group for each set of children
               * {type: GROUP,
                  group: true,
                  children: {nodes: [nodeIDs]} | [{nodes: [nodeIDs]}], }
               *
               * add to existing group(s)
               * Passing in array of groups and children will map each set of children to each group
               * {type: GROUP,
                  group: {groupObj} | [{groupObj}],
                  children: {nodes: [nodeIDs]} | [{nodes: [nodeIDs]}], }
               *
               * Remove from group
               * {type: GROUP,
                  group: false,
                  children: {nodes: [nodeIDs]} | [{nodes: [nodeIDs]}], }
               *
               */
              case GROUP: {
                /**
                 * Helper function to create group object
                 */
                const initGroupHelper = () => ({
                  id: `grup-${uuid()}`,
                  data: { color: '#F6ECAF', class: '' },
                });

                const applyTranslationHelper = () => {
                  const nodeIDs = trans.targets;
                  const nodes = nodeIDs.map(id => this.graph.getNode(id));
                  const xVal = nodes.map(d => d.x + trans.x);
                  const yVal = nodes.map(d => d.y + trans.y);
                  // TODO does textnodes really need position to be updated?
                  this.graph.editNode({
                    property: 'x',
                    id: nodeIDs,
                    value: xVal,
                  });
                  this.graph.editNode({
                    property: 'y',
                    id: nodeIDs,
                    value: yVal,
                  });
                };
                const children = Array.isArray(action.children) ? action.children : [action.children];
                const trans = action.translation;
                // save previous group node belonged to
                const prevGroupMap = new Map();
                children.forEach((child) => {
                  child.nodes.forEach(id => {
                    const d = this.graph.getNode(id);
                    const g = d.parent ? this.graph.getGroup(d.parent.id) : false;
                    if (prevGroupMap.has(g)) {
                      prevGroupMap.get(g).nodes.push(id);
                    } else {
                      prevGroupMap.set(g, { nodes: [id] });
                    }
                  });
                });

                if (!action.group) {
                  // if groups is false or undefined, remove from group
                  this.graph.unGroup(children);
                } else {
                  const groups = Array.isArray(action.group) ? action.group : [action.group];
                  // take array of children and match children to each group.
                  children.forEach((child, i) => {
                    // if group is false, then ungroup children
                    if (groups[i] === false) {
                      this.graph.unGroup(children[i]);
                    } else {
                      // if group does not exist for this set of children create new group
                      if (groups[i] === true || groups[i] === undefined) {
                        groups[i] = initGroupHelper();
                      }
                      // add to group
                      this.graph.addToGroup(groups[i], children[i], true);
                    }
                  });
                  this.graph.restart.layout();
                }
                const opposingAction = {
                  type: GROUP,
                  group: [...prevGroupMap.keys()],
                  children: [...prevGroupMap.values()],
                };
                if (trans) {
                  applyTranslationHelper();
                  opposingAction.translation = { targets: trans.targets, x: -trans.x, y: -trans.y, };
                }
                undoStack.push(opposingAction);
                break;
              }

              case GROUPEDIT: {
                let oldValues;
                const idArray = Array.isArray(action.id) ? action.id : [action.id];
                const values = Array.isArray(action.value) ? action.value : [action.value];
                const groups = idArray.map(id => this.graph.getGroup(id));
                const property = action.prop;
                oldValues = groups.map(g => g.data[property]);
                if (values.length > 1 && values.length === idArray.length) {
                  groups.forEach((g, i) => {
                    g.data[property] = values[i];
                  });
                } else {
                  groups.forEach((g) => {
                    g.data[property] = values[0];
                  });
                }
                undoStack.push({
                  type: GROUPEDIT,
                  prop: property,
                  value: oldValues,
                  id: action.id,
                });
                this.graph.restart.styles();
                break;
              }

              default: {
                console.log('Unknown action:', action.type);
              }
            }
          })
        ).subscribe(
          action => console.log('action', action, undoStack.length, redoStack.length),
          console.error,
          () => console.log('FINISH'),
        );
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
        return Promise.resolve();
      },

      mouseDownGroup(d, d3Selection, e) {
        this.groupDrag = true;
        const svgSel = this.graph.getSVGElement();
        const scale = 1.25;
        const centreOffset = 32 * scale;
        const damping = 4;

        const g = svgSel.select('g.svg-graph')
          .append('g')
          .attr('transform', `translate(0,0),scale(${scale})`);

        //get nodes to be changed
        let nodes = [];
        if (this.mouseState === SELECT) {
          nodes = [...this.activeSelect.nodes.values()];
        }
        nodes = [d].concat(nodes.filter(node => node.id !== d.id));

        // get elements involved in drag animation
        const elemArr = [];
        let coordArr = [];
        nodes.forEach((d) => {
          // add semi transparent effect to nodes
          if (!d.class.includes('translucent')) {
            d.class += ' translucent';
          }
          const coord = { x: (d.x - centreOffset), y: (d.y - centreOffset) };
          coordArr.push(coord);
          const elem = g.append('path')
            .attr('fill', d.color)
            .attr('d', this.nodeShapeToPath({ nodeShape: d.nodeShape }))
            .attr('stroke', 'grey')
            .attr('transform', `translate(${coord.x / scale},${coord.y / scale})`);
          elemArr.push(elem);
        });
        this.graph.restart.styles();
        elemArr.slice(0, 2).reverse().forEach(sel => sel.raise());

        // initial coords
        const { x: xi, y: yi } = this.transformCoordinates({ x: e.clientX, y: e.clientY });
        // end event
        const end = fromEvent(document, 'mouseup');
        // move event
        const move = fromEvent(document, 'mousemove').pipe(
          map(e => this.transformCoordinates({ x: e.x, y: e.y })),
          finalize(() => {
            // on end remove elements in drag animation
            g.node().remove();
            // remove translucency effect
            nodes.forEach(d => {
              d.class = d.class.replace(' translucent', '');
            });
            this.graph.restart.styles();
          }),
          takeUntil(end),
        );

        move.pipe(takeLast(1))
          .subscribe(({ x: xf, y: yf }) => {
            // get mouse target
            const target = this.graph.selectByCoords({ x: xf, X: xf, y: yf, Y: yf });
            let targetGroup;
            let draggedNodes = nodes; // nodes that are in the drag selection
            if (target.groups.length > 0) { // mouse target is a group
              targetGroup = target.groups[0];
            } else {
              if (target.nodes.length > 0) { // mouse target is another node
                draggedNodes = draggedNodes.filter(node => node.id !== target.nodes[0].id);
                nodes = draggedNodes.concat(target.nodes[0]);
              }
            }
            // map nodes to IDs
            const draggednodesIDs = draggedNodes.map(node => node.id);
            // if node interacted with is in a group and target is nothing ungroup all nodes
            if (target.groups.length === 0 && target.nodes.length === 0) {
              const nodeIDs = nodes.filter(d => d.parent).map(node => node.id);
              if (nodeIDs.length > 0) {
                this.rootObservable.next({
                  type: GROUP,
                  group: false,
                  children: { nodes: nodeIDs },
                });
              }
            } else {
              this.rootObservable.next({
                type: GROUP,
                group: targetGroup ? targetGroup : true,
                children: { nodes: nodes.map(node => node.id) },
                translation: { targets: draggednodesIDs, x: xf - d.x, y: yf - d.y },
              });
            }
          });

        // drag animation - causes the "trails"
        // updates every 25ms moving a part of the way between the previous position and the mouse position.
        // nodes "behind" have an offset to their target position
        combineLatest(merge(move, of({ x: xi, y: yi })),
          interval(25)).pipe(
          takeUntil(end),
        ).subscribe(([{ x, y }, ..._]) => {
          coordArr = coordArr.map(({ x: xpp, y: ypp }, i) => ({
            x: xpp + (x - centreOffset + 5 * Math.min(2, i) - xpp) / (damping + Math.min(2, i)),
            y: ypp + (y - centreOffset + 5 * Math.min(2, i) - ypp) / (damping + Math.min(2, i)),
          }));

          elemArr.forEach((e, i) => {
            e.attr('transform', `translate(${(coordArr[i].x) / scale},${coordArr[i].y / scale})`);

          });
        });
      },

      nodeShapeToPath(d) {
        switch (d.nodeShape) {
          case 'rect': {
            return 'M16 48 L48 48 L48 16 L16 16 Z';
          }
          case 'circle': {
            return 'M16,34a16,16 0 1,0 34,0a16,16 0 1,0 -34,0';
          }
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

      createGraph() {
        const $mouseOverNode = this.mouseOverNode$;
        const $mousedown = this.mouseDown$;
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

        const layoutOptions = {
          layoutType: 'jaccardLinkLengths',
          edgeLength: 170,
          jaccardModifier: 0.9,
          height: document.getElementById(this.$el.id).clientHeight,
          width: document.getElementById(this.$el.id).clientWidth,
          edgeSmoothness: 15,
          palette: palette,

          nodeToColor: function nodeToColor(d) {
            return d.color ? d.color : ' "#ffffff"';
          },

          nodeToPin: function nodeToPin(d) {
            // 1st bit is user set, second bit is set by d3 whilst dragging. hence check LSB if d.fixed is not bool
            return (d.fixed === true || d.fixed % 2 === 1);
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

          groupFillColor: (g) => {
            return g && g.data.color ? g.data.color : '#F6ECAF';
          },

          mouseOverRadial: (node) => {
            this.dbClickCreateNode = false;
          },

          mouseOutRadial: (node) => {
            if (!this.ifColorPickerOpen) {
              this.dbClickCreateNode = true;
            }
          },

          clickAway: () => {
            this.closeHoverMenu();
          },

          zoomScale: (scale) => {
            this.scale = scale;
          },

          selection: () => {
            return this.activeSelect;
          },

          nodeSizeChange: () => {
            this.updateHoverMenu();
          },

          endGroupDrag: (d) => {
            this.groupDrag = false;
          },

          mouseOverGroup: (group, selection, e) => {
            if (!this.hoverDisplay) {
              this.hoverQueue$.next(() => this.createHoverMenu(group, selection, e));
            } else {
              this.hoverAwait = [group, selection, e];
            }
          },

          mouseOutGroup: (group, selection, e) => {
            this.hoverQueue$.next(false);
          },

          mouseOverNode: (node, selection, e) => {
            this.closeEdgeHoverMenu();
            this.hoverQueue$.next(() => this.createHoverMenu(node, selection, e));
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
          },

          mouseOutNode: (node, selection, e) => {
            this.hoverQueue$.next(false);
            me.dbClickCreateNode = true;
            me.clickedGraphViz = true;
            const tempNode = { ...node, mouseOverNode: false };
            $mouseOverNode.next(tempNode);
            currentState.currentNode.mouseOverNode = false;
          },

          mouseOverEdge: (edge, selection, e) => {
            this.closeHoverMenu();
            this.hoverQueue$.next(() => this.createEdgeHoverMenu(edge, selection, e));
            me.dbClickCreateNode = false;
            me.clickedGraphViz = false;
          },

          mouseOutEdge: () => {
            this.hoverQueue$.next(false);
          },

          edgeColor: (predicate) => {
            return predicate ? (predicate.stroke ? predicate.stroke.substring(1) : "000000") : "000000";
          },

          edgeStroke: (predicate) => {
            return predicate ? (predicate.strokeWidth ? predicate.strokeWidth : 2) : 2;
          },

          edgeDasharray: (predicate) => {
            return predicate ? (predicate.strokeDasharray ? predicate.strokeDasharray : 0) : 0;
          },

          edgeRemove: (edge, selection, e) => {
            this.changeMouseState(POINTER);
            this.rootObservable.next({
              type: DELETE,
              triplet: edge,
            });
          },

          imgResize: (bool) => {
            this.isResizing = bool;
          },

          canDrag: () => (this.$data.mouseState === POINTER || this.mouseState === SELECT) && !this.isResizing,

          isSelect: () => {
            return this.$data.mouseState === SELECT;
          },

          clickGroup: (d, selection, e) => {
            if (this.mouseState === POINTER || this.mouseState === SELECT) {
              if (this.mouseState === POINTER) {
                this.changeMouseState(SELECT);
              }
              this.activeSelect.selectExclusive(d);
              this.graph.restart.styles();
            }
          }
        };

        this.graph = networkViz('graph', layoutOptions);

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
        // Set the action of double clicking the edge:
        this.graph.edgeOptions.setDblClickEdge((edge, elem) => {
            $mousedown.next({
              type: 'EDITEDGE',
              edge: edge,
              restart: this.graph.restart.layout,
              textElem: elem.node().querySelector('text'),
              save: (newText) => {
                this.rootObservable.next({
                  type: EDGEEDIT,
                  prop: TEXT,
                  value: newText,
                  hash: edge.predicate.hash,
                });
              },
            });
        });

        this.graph.edgeOptions.setClickEdge((edge) => {
          if (this.mouseState === POINTER || this.mouseState === SELECT) {
            if (this.mouseState === POINTER) {
              this.changeMouseState(SELECT);
            }
            this.activeSelect.selectExclusive(edge);
            this.graph.restart.styles();
          }
        });

        // Set the action of clicking the node:
        this.graph.nodeOptions.setClickNode((node) => {
          if (this.mouseState === POINTER || this.mouseState === SELECT) {
            if (this.mouseState === POINTER) {
              this.changeMouseState(SELECT);
            }
            this.activeSelect.selectExclusive(node);
            this.graph.restart.styles();
          }
        });

        // Set the action of double clicking the node:
        this.graph.nodeOptions.setDblClickNode((node, elem) => {
          // If the mouse is a pointer and a note is clicked on set edit mode.
          if (node.hash.slice(0, 5) === 'note-') {
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
          // this.closeHoverMenu();
          this.mouseState = TEXTEDIT;
        }, () => {
          this.canKeyboardUndo = true;
          this.changeMouseState(POINTER);
        });

        // set clickedgraphviz to true first time user clicks
        const svgElem = this.graph.getSVGElement().node();
        fromEvent(svgElem, 'click').pipe(
          takeUntil(this.destroy$),
          take(1),
        ).subscribe(() => {
          this.clickedGraphViz = true;
        });

        // TODO find permanent solution to nodes created wrong size upon loading
        setTimeout(this.graph.restart.layout, 50);

        return Promise.resolve();
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

      addNodeHelper(nodeId, x, y, preventLayout) {
        // Adds nodes, and ignores the node if it can't be found.
        // This lets us optimistically create the diagram.
        const indexOfNode = this.textNodes.map(v => v.id).indexOf(nodeId);
        if (indexOfNode !== -1) {
          let node = this.toNode(this.textNodes[indexOfNode]);
          if (x && y) {
            node = { x, y, ...node };
          }
          this.graph.addNode(node, preventLayout);
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

      nodeRemove(node) {
        this.closeHoverMenu();
        this.changeMouseState(POINTER);
        this.rootObservable.next({
          type: DELETE,
          nodeId: node.id,
        });
      },

      groupRemove(group) {
        this.closeHoverMenu();
        this.rootObservable.next({
          type: GROUP,
          group: false,
          children: { nodes: group.map(g => g.leaves.map(d => d.id)).reduce((acc, cur) => acc.concat(cur), []) },
        });
      },

      mouseOverBrush(node, ev) {
        this.dbClickCreateNode = false;
        this.ifColorPickerOpen = true;
        this.coloredNodeId = [];
        const targetId = node.id;
        const multipleSelected = this.activeSelect.includes(targetId);
        if (!multipleSelected) {
          this.coloredNodeId = [targetId];
        } else {
          switch (targetId.slice(0, 4)) {
            case 'note': {
              [...this.activeSelect.nodes.keys()].forEach(id => this.coloredNodeId.push(id));
              break;
            }
            case 'grup': {
              [...this.activeSelect.groups.keys()].forEach(id => this.coloredNodeId.push(id));
              break;
            }
          }
        }

        this.colors = node.color ? node.color : node.data.color;
        this.$refs.vueColorPicker.currentColor = node.color;

        let graphEditor = document.getElementById('graph').getBoundingClientRect();
        let graphEditorX = graphEditor.x;
        let graphEditorY = graphEditor.y;
        let graphEditorW = graphEditor.width;
        let graphEditorH = graphEditor.height;
        let posX = ev.clientX - graphEditorX;
        let posY = ev.clientY + 50 - graphEditorY;

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
        fromEvent(svgElem, 'click').pipe(
          takeWhile(() => this.ifColorPickerOpen === true),
          take(1),
          tap(e => e.stopPropagation()),
          tap(e => e.preventDefault()),
        ).subscribe(() => {
          this.ifColorPickerOpen = false;
        });
      },

      startArrow(node, selection) {
        this.mouseState = CREATEEDGE;
        this.currentNode = node;
        this.mouseDown$.next({ type: 'CREATEEDGE', clickedNode: node, selection: selection });
      },

      resizeDrag(node, elem, event) {
        if (this.mouseState === TEXTEDIT) {
          return;
        }
        const prevMouseState = this.mouseState;
        // this.changeMouseState(POINTER);
        this.isResizing = true;
        const initialX = event.clientX;
        const svgInitialX = this.transformCoordinates({ x: initialX, y: event.clientY }).x;
        const initWidth = node.width;

        fromEvent(document, 'mousemove').pipe(
          tap(e => e.stopPropagation()),
          map(e => this.transformCoordinates({ x: e.clientX, y: event.clientY }).x),
          map(moveX => moveX - svgInitialX),
          map(dx => initWidth + (dx * 2)),
          filter((width) => {
            const img = elem.node().parentNode.querySelector('image');
            const imgWidth = img ? img.getBBox().width : 0;
            const minWidth = imgWidth + 30;
            return width > minWidth;
          }),
          debounceTime(10),
          takeUntil(fromEvent(document, 'mouseup').pipe(take(1))),
          finalize(() => {
            this.isResizing = false;
            this.rootObservable.next({
              type: NODEEDIT,
              prop: WIDTH,
              id: node.id,
              value: node.fixedWidth,
            });
          }),
        ).subscribe((x) => {
          node.fixedWidth = x;
          this.graph.restart.layout();
          this.mouseState = prevMouseState;
        });
      },

      dblClickOnPage(e) {
        if (!this.dbClickCreateNode
          || this.hoverDisplay
          || this.ifColorPickerOpen
          || this.mouseState === TEXTEDIT
          || e.target.tagName !== 'svg') return;
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

      createHoverMenu(d, selection, e) {
        this.dbClickCreateNode = false;
        const elem = selection.node();
        const pos = elem.getBoundingClientRect();
        this.hoverPos = { x: pos.x, y: pos.y, width: pos.width, height: pos.height };
        this.hoverColor = d.color || d.data.color;
        this.hoverFixed = (d.fixed === true || d.fixed % 2 === 1);
        this.hoverDisplay = true;
        this.hoverShape = d.nodeShape;
        this.hoverType = d.id.slice(0, 4);
        this.hoverData = { data: d, el: selection };
      },

      updateHoverMenu() {
        if (this.hoverData) {
          const d = this.hoverData.data;
          const pos = this.hoverData.el.node().getBoundingClientRect();
          this.hoverPos = { x: pos.x, y: pos.y, width: pos.width, height: pos.height };
          this.hoverColor = d.color || d.data.color;
          this.hoverFixed = (d.fixed === true || d.fixed % 2 === 1);
          this.hoverShape = d.nodeShape;
        }
      },

      closeHoverMenu(event) {
        if (!this.ifColorPickerOpen) {
          this.dbClickCreateNode = true;
        }
        this.hoverDisplay = false;
        this.hoverPos = undefined;
        this.hoverData = undefined;
        if (this.hoverAwait) {
          this.createHoverMenu(...this.hoverAwait);
          this.hoverAwait = false;
        }
      },

      hoverInteract(event) {
        const target = event.data.data;
        const nodes = [];
        const groups = [];
        if (target && this.activeSelect.includes(target.id)) {
          [...this.activeSelect.nodes.values()].forEach(d => nodes.push(d));
          [...this.activeSelect.groups.values()].forEach(d => groups.push(d));
        } else {
          if (target.id.slice(0, 4) === 'note') {
            nodes.push(target);
          } else if (target.id.slice(0, 4) === 'grup') {
            groups.push(target);
          }
        }
        const d3Selection = event.data.el;
        const payload = event.payload;
        const e = event.e;
        switch (event.type) {
          case COLOR: {
            this.mouseOverBrush(target, e);
            break;
          }
          case CREATEEDGE: {
            this.startArrow(target, d3Selection);
            break;
          }
          case DELETE: {
            if (target.id.slice(0, 4) === 'grup') {
              this.groupRemove(groups);
            } else {
              this.closeHoverMenu();
              this.changeMouseState(POINTER);
              this.rootObservable.next({
                type: DELETE,
                nodeId: nodes.map(d => d.id),
              });
            }
            break;
          }
          case GROUPDRAG: {
            this.mouseDownGroup(target, d3Selection, e);
            break;
          }
          case NODERESIZE: {
            this.resizeDrag(target, d3Selection, e);
            break;
          }
          case PIN: {
            this.rootObservable.next({
              type: NODEEDIT,
              prop: PIN,
              id: nodes.map(d => d.id),
              value: !target.fixed,
            });
            this.hoverFixed = (target.fixed === true || target.fixed % 2 === 1);
            break;
          }
          case SHAPE: {
            if (!nodes.every(d => d.nodeShape === payload)) {
              this.rootObservable.next({
                type: NODEEDIT,
                prop: SHAPE,
                value: payload,
                id: nodes.map(d => d.id),
              });
              this.nodeShapeChange(nodes, payload);
              this.hoverShape = target.nodeShape;
            }
            break;
          }
          default: {
            console.warn('Unrecognised event ', event.type, ' on ', event.data);
          }
        }

      },

      createEdgeHoverMenu(d, selection, e) {
        // const elem = selection.node();
        // const pos = elem.getBoundingClientRect();
        this.hoverEdgePos = { x: e.clientX, y: e.clientY, width: 50, height: 50 };
        this.hoverEdgeColor = d.predicate ? (d.predicate.stroke || "#000000") : "#000000";
        this.hoverEdgeDisplay = true;
        this.hoverEdgeType = d.predicate ? d.predicate.hash.slice(0, 4) : "edge";
        this.hoverEdgeData = { data: d, el: selection };
      },

      closeEdgeHoverMenu() {
        this.hoverEdgeDisplay = false;
        this.hoverEdgePos = undefined;
        this.hoverEdgeData = undefined;
        if (this.hoverAwait) {
          this.createEdgeHoverMenu(...this.hoverAwait);
          this.hoverAwait = false;
        }
      },

      edgeColorChange(edges, e) {
        this.dbClickCreateNode = false;
        this.ifColorPickerOpen = true;
        // this.coloredEl = element._groups[0];
        this.coloredNodeId = edges.map(edge => edge.predicate.hash);
        this.colors = edges[0].predicate.stroke ? edges[0].predicate.stroke : '#000000';
        this.$refs.vueColorPicker.currentColor = this.colors;

        let graphEditor = document.getElementById('graph').getBoundingClientRect();
        let graphEditorX = graphEditor.x;
        let graphEditorY = graphEditor.y;
        let graphEditorW = graphEditor.width;
        let graphEditorH = graphEditor.height;
        let posX = e.clientX - graphEditorX;
        let posY = e.clientY + 50 - graphEditorY;

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
        console.log(svgElem);
        fromEvent(svgElem, 'click').pipe(
          takeWhile(() => this.ifColorPickerOpen === true),
          take(1),
          tap(e => e.stopPropagation()),
          tap(e => e.preventDefault()),
        ).subscribe(() => {
          this.ifColorPickerOpen = false;
        });
      },

      edgeRemove(edge) {
        this.changeMouseState(POINTER);
        this.rootObservable.next({
          type: DELETE,
          triplet: edge,
        });
      },

      edgeWeightChange(edges, payload) {
        this.rootObservable.next({
          type: EDGEEDIT,
          prop: WEIGHT,
          value: edges.map(_ => payload),
          hash: edges.map(edge => edge.predicate.hash),
        });
      },

      edgeDashChange(edges, payload) {
        this.rootObservable.next({
          type: EDGEEDIT,
          prop: DASH,
          value: edges.map(_ => payload),
          hash: edges.map(edge => edge.predicate.hash),
        });
      },

      hoverEdgeInteract(event) {
        const edge = event.data.data;
        // const d3Selection = event.data.el;
        const payload = event.payload;
        const edges = [];
        if (edge && this.activeSelect.includes(edge.predicate.hash)) {
          [...this.activeSelect.edges.values()].forEach(d => edges.push(d));
        } else {
          edges.push(edge);
        }
        switch (event.type) {
          case COLOR: {
            this.edgeColorChange(edges, event.e);
            break;
          }
          case WEIGHT: {
            this.edgeWeightChange(edges, payload);
            break;
          }
          case DASH: {
            this.edgeDashChange(edges, payload);
            break;
          }
          case DELETE: {
            this.edgeRemove(edges);
            break;
          }
          default: {
            console.warn('Unrecognised event ', event.type, ' on ', event.data);
          }
        }
      },

      loadFromSaved(savedGraph) {
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
        //create groups
        const groups = savedGraph.groups;
        if (groups) {
          groups.forEach((g) => {
            this.graph.addToGroup({ id: g.id, data: g.data }, { nodes: g.nodes, groups: g.groups }, true);
          });
        }
        this.graph.restart.layout();
      },

      readFile(event) {
        const file = event.target.files[0];
        if (file.type === 'image/svg+xml') {
          const reader = new FileReader();
          reader.onload = () => {
            const parser = new DOMParser();
            const svg = parser.parseFromString(reader.result, 'text/xml');
            const desc = svg.querySelector('#graphJSONData');
            if (desc && desc.innerHTML) {
              const graphData = JSON.parse(desc.innerHTML);
              graphData.textNodes.forEach(x => this.textNodes.push(x));
              this.clearScreen().then(() => {
                this.rootObservable.next({ type: CLEARHISTORY });
                this.loadFromSaved(graphData.saved);
              });
            } else {
              console.warn('No saved data found');
            }
          };
          reader.readAsText(file);
        } else {
          console.warn('unrecoginsed file type.');
        }
      },

      changeMouseState(state) {
        if (!(state === ADDNOTE
          || state === BOLD
          || state === CLEARSCREEN
          || state === COPY
          || state === COLOR
          || state === DELETE
          || state === GROUP
          || state === IMPORTPROB
          || state === ITALIC
          || state === OPEN
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
          this.mouseStateObs$.next(state);
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
            let nodes = [...this.activeSelect.nodes.values()];
            let edges = [...this.activeSelect.edges.values()];
            const reCheckBold = /^ *(<.*>)*(<b>)(.*)(<\/b>)(<\/.*>)* *$/;
            const bold = nodes.every((d) => reCheckBold.test(d.shortname)) && edges.every((d) => reCheckBold.test(d.predicate.text));
            nodes = nodes.map(d => {
              // remove existing bold tags
              let str = d.shortname.replace(/<b>|<\/b>/g, '');
              if (!bold) {
                // add bold tags to outside of string
                str = '<b>' + str + '</b>';
              }
              return str;
            });
            edges = edges.map(d => {
                // remove existing bold tags
                let str = d.predicate.text.replace(/<b>|<\/b>/g, '');
                if (!bold) {
                  // add bold tags to outside of string
                  str = '<b>' + str + '</b>';
                }
                return str;
              }
            );
            if (nodes.length > 0) {
              this.rootObservable.next({
                type: NODEEDIT,
                prop: TEXT,
                id: [...this.activeSelect.nodes.keys()],
                value: nodes,
              });
            }
            if (edges.length > 0) {
              this.rootObservable.next({
                type: EDGEEDIT,
                prop: TEXT,
                hash: [...this.activeSelect.edges.keys()],
                value: edges,
              });
            }
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
            this.colors.hex = '#FFFFFF';
            this.styleObject = {
              position: 'absolute !important',
              top: 70 + 'px !important',
              right: 95 + 'px !important',
              'z-index': '9999'
            };
            const svgElem = this.graph.getSVGElement().node();
            fromEvent(svgElem, 'click').pipe(
              takeUntil(this.destroy$),
              takeWhile(() => this.ifColorPickerOpen === true), // TODO use of takewhile is incorrect
              take(1),
              tap(e => e.stopPropagation()),
              tap(e => e.preventDefault()),
            ).subscribe(() => {
              this.ifColorPickerOpen = false;
            });
            break;
          }

          case COPY: {
            if (this.activeSelect.nodes.size === 0) break;
            const idMap = new Map();
            const svg = this.graph.getSVGElement().node();
            const b = svg.getBoundingClientRect();
            const editorBounds = this.transformCoordinates({ x: b.width + b.x, y: b.height + b.y });
            const newNodes = [...this.activeSelect.nodes.values()]
              .map(d => {
                const { color, fixed, fixedWidth, img, isSnip, nodeShape, shortname, id, x, y, width, height } = d;
                const newId = 'note-' + uuid();
                const newX = x + 100 + width / 2 > editorBounds.x ? x - 20 - width / 2 : x + 20 + width / 2;
                const newY = y + 160 + height > editorBounds.y ? y - 15 - height : y + 15 + height;
                const newnode = {
                  color,
                  fixed,
                  fixedWidth,
                  img,
                  isSnip,
                  nodeShape,
                  shortname,
                  class: d.class.replace(' highlight', ''),
                  id: newId,
                  hash: newId,
                  x: newX,
                  y: newY,
                };
                idMap.set(id, newnode);
                return newnode;
              });
            const newEdges = [...this.activeSelect.edges.values()]
              .filter(d => idMap.has(d.predicate.subject) || idMap.has(d.predicate.object))
              .map(d => {
                  let subject = d.source;
                  const predicate = d.predicate;
                  let object = d.target;
                  if (idMap.has(predicate.subject)) {
                    subject = idMap.get(predicate.subject);
                  }
                  if (idMap.has(predicate.object)) {
                    object = idMap.get(predicate.object);
                  }
                  const newPredicate = Object.assign({}, predicate);
                  newPredicate.subject = subject.id;
                  newPredicate.object = object.id;
                  newPredicate.hash = 'edge-' + uuid();
                  newPredicate.class = newPredicate.class.replace(' highlight', '');
                  return { subject, predicate: newPredicate, object };
                }
              );
            this.changeMouseState(POINTER);
            this.rootObservable.next({
              type: CREATE,
              newNode: newNodes,
              triplet: newEdges,
            });
            break;
          }

          case DELETE: {
            const nodes = [...this.activeSelect.nodes.keys()];
            const edges = [...this.activeSelect.edges.values()];
            this.changeMouseState(POINTER);
            this.activeSelect.clear();
            if (nodes.length === 0 && edges.length === 0) break;
            this.rootObservable.next({
              type: DELETE,
              nodeId: nodes,
              triplet: edges,
            });
            break;
          }

          case GROUP : {
            const nodes = [...this.activeSelect.nodes.keys()];
            if (nodes.length > 0) {
              this.rootObservable.next({
                type: GROUP,
                group: true,
                children: { nodes },
              });
              this.changeMouseState(POINTER);
            }
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
              const id = 'note-' + uuid();
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
                    hash: 'edge-' + uuid(),
                    subject: objOfNodes[n].id,
                    object: objOfNodes[key].id,
                    class: '',
                    constraint: {
                      axis: 'y',
                      type: 'separation',
                      leftID: objOfNodes[n].id,
                      rightID: objOfNodes[key].id,
                      gap: 170,
                    },
                    stroke: "#000000",
                    strokeWidth: 2,
                    strokeDasharray: 0,
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
            let nodes = [...this.activeSelect.nodes.values()];
            let edges = [...this.activeSelect.edges.values()];
            const reCheckItalic = /^ *(<.*>)*(<i>)(.*)(<\/i>)(<\/.*>)* *$/;
            const italic = nodes.every((d) => reCheckItalic.test(d.shortname)) && edges.every((d) => reCheckItalic.test(d.predicate.text));
            nodes = nodes.map(d => {
              let str = d.shortname.replace(/<i>|<\/i>/g, ''); // remove existing italic tags
              if (!italic) {
                str = '<i>' + str + '</i>';// add italic tags to outside of string
              }
              return str;
            });
            edges = edges.map(d => {
                let str = d.predicate.text.replace(/<i>|<\/i>/g, ''); // remove existing italic tags
                if (!italic) {
                  str = '<i>' + str + '</i>'; // add italic tags to outside of string
                }
                return str;
              }
            );
            if (nodes.length > 0) {
              this.rootObservable.next({
                type: NODEEDIT,
                prop: TEXT,
                id: [...this.activeSelect.nodes.keys()],
                value: nodes,
              });
            }
            if (edges.length > 0) {
              this.rootObservable.next({
                type: EDGEEDIT,
                prop: TEXT,
                hash: [...this.activeSelect.edges.keys()],
                value: edges,
              });
            }
            break;
          }

          case OPEN: {
            this.changeMouseState(POINTER);
            const fileInput = document.createElement('input');
            fileInput.setAttribute('type', 'file');
            fileInput.click();
            fileInput.onchange = (e) => {
              this.readFile(e);
            };
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
            this.mouseState = POINTER;
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
            this.activeSelect.clear();
            this.changeMouseState(POINTER);
            this.closeHoverMenu();

//            this.destroy$.next(true);
//            this.destroy$.unsubscribe();
//
//            const text = 'Saving Graph...';
//            this.showLoadingMask(text);

            setTimeout(async () => {
              const savedData = await this.graph.saveGraph();
              this.$emit('save', savedData, this.graph.getSVGElement().node(), this.textNodes);
            }, 50);
            break;
          }

          case SELECT: {
            const svgSel = this.graph.getSVGElement();
            const svg = svgSel.node();
            const endSelect = this.mouseStateObs$.pipe(filter(e => e !== SELECT));

            // detect mouse down and drag, filters for events that start over background only.
            fromEvent(svg, 'mousedown').pipe(
              takeUntil(endSelect),
              filter(e => e.target.tagName === 'svg'),
              map(e => ({ ...this.transformCoordinates({ x: e.x, y: e.y }), shift: e.shiftKey, alt: e.altKey })),
              map(({ x, y, shift, alt }) => {
                // number of selected items prior to clicking
                const preSize = this.activeSelect.size;
                if (!shift && !alt) {
                  this.activeSelect.clear();
                }
                return { x, y, addTo: !alt, preSize };
              }),
              map(({ x, y, addTo, preSize }) => {
                const g = svgSel.select('.svg-graph');
                const elem = g.append('path')
                  .attr('id', 'selector')
                  .attr('d', `M${x} ${y} H${x} V${y} H${x}Z`)
                  .attr('style', 'stroke:rgb(78, 140, 233);stroke-width:1')
                  .attr('shape-rendering', 'crispEdges')
                  .attr('fill', 'rgba(78,168,233,0.1)')
                  .attr('stroke-dasharray', '4 3');
                return { x, y, addTo, elem, preSize };
              }),
            ).subscribe(({ x, y, addTo, elem, preSize }) => {
              const mouseUp = fromEvent(document, 'mouseup').pipe(take(1));

              mouseUp.pipe(
                map(e => this.transformCoordinates({ x: e.x, y: e.y })),
                map(e => ({ X: e.x, Y: e.y })),
              ).subscribe(({ X, Y }) => {
                // if mouse has not moved between mouse down and mouse up and
                // and target is SVG and nothing was selected before interaction
                // exit select tool
                if (X === x && Y === y && preSize === 0 && this.activeSelect.size === 0) {
                  this.changeMouseState(POINTER);
                }
                elem.remove();
                this.graph.restart.styles();
              });

              fromEvent(document, 'mousemove').pipe(
                tap(e => e.preventDefault()),
                tap(e => e.stopPropagation()),
                map(e => this.transformCoordinates({ x: e.x, y: e.y })),
                map(e => ({ X: e.x, Y: e.y })),
                map(({ X, Y }) => {
                  elem.attr('d', `M${x} ${y} H${X} V${Y} H${x}Z`);
                  const selection = this.graph.selectByCoords({ x, X, y, Y });
                  return [...selection.nodes, ...selection.edges];
                }),
                pairwise(),
                takeUntil(mouseUp),
              ).subscribe(([oldSelect, currentSelect]) => {
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

            /** DEFINE KEYBOARD SHORTCUTS FOR SELECT TOOL **/
            const keyDown = fromEvent(svg, 'keydown').pipe(
              takeUntil(this.destroy$),
              takeUntil(endSelect),
            );

            const ctrl = keyDown.pipe(filter(e => (e.ctrlKey || e.metaKey && !e.shiftKey && !e.altKey)));

            // ESC clear selection or exit if nothing selected
            keyDown.pipe(
              filter(e => e.keyCode === 27),
              tap(e => e.preventDefault()),
            ).subscribe(() => {
              if (this.activeSelect.size > 0) {
                this.activeSelect.clear();
                this.graph.restart.styles();
              } else {
                this.changeMouseState(POINTER);
              }
            });

            // DEL delete
            keyDown.pipe(
              filter(e => e.keyCode === 46),
              tap(e => e.preventDefault()),
            ).subscribe(() => {
              this.changeMouseState(DELETE);
            });

            // ctrl + C duplicate
            ctrl.pipe(
              filter(e => e.keyCode === 67),
              tap(e => e.preventDefault()),
            ).subscribe(() => {
              this.changeMouseState(COPY);
            });

            // ctrl + U underline
            ctrl.pipe(
              filter(e => e.keyCode === 85),
              tap(e => e.preventDefault()),
            ).subscribe(() => {
              this.changeMouseState(UNDERLINE);
            });
            // ctrl + B underline
            ctrl.pipe(
              filter(e => e.keyCode === 66),
              tap(e => e.preventDefault()),
            ).subscribe(() => {
              this.changeMouseState(BOLD);
            });
            // ctrl + I italic
            ctrl.pipe(
              filter(e => e.keyCode === 73),
              tap(e => e.preventDefault()),
            ).subscribe(() => {
              this.changeMouseState(ITALIC);
            });
            break;
          }

          case UNDERLINE: {
            this.mouseState = SELECT;
            let nodes = [...this.activeSelect.nodes.values()];
            let edges = [...this.activeSelect.edges.values()];
            const reCheckUnderlined = /^ *(<.*>)*(<u>)(.*)(<\/u>)(<\/.*>)* *$/;
            const underline = nodes.every((d) => reCheckUnderlined.test(d.shortname)) && edges.every((d) => reCheckUnderlined.test(d.predicate.text));
            nodes = nodes.map(d => {
              // remove existing underlines
              // let str = d.shortname.replace(/^ *(<.*>)*(<u>)(.*)(<\/u>)(<\/.*>)* *$/, '$1$3$5');
              let str = d.shortname.replace(/<u>|<\/u>/g, '');
              if (!underline) {
                // add underline tags inside other tegs
                str = str.replace(/ *^((<[^<>]*>)*)(.*?)((<\/[^<>]*>)*)$ */, '$1<u>$3</u>$4');
              }
              return str;
            });
            edges = edges.map(d => {
              // remove existing underlines
              // let str = d.shortname.replace(/^ *(<.*>)*(<u>)(.*)(<\/u>)(<\/.*>)* *$/, '$1$3$5');
              let str = d.predicate.text.replace(/<u>|<\/u>/g, '');
              if (!underline) {
                // add underline tags inside other tegs
                str = str.replace(/ *^((<[^<>]*>)*)(.*?)((<\/[^<>]*>)*)$ */, '$1<u>$3</u>$4');
              }
              return str;
            });
            if (nodes.length > 0) {
              this.rootObservable.next({
                type: NODEEDIT,
                prop: TEXT,
                id: [...this.activeSelect.nodes.keys()],
                value: nodes,
              });
            }
            if (edges.length > 0) {
              this.rootObservable.next({
                type: EDGEEDIT,
                prop: TEXT,
                hash: [...this.activeSelect.edges.keys()],
                value: edges,
              });
            }
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
        const svg = this.graph.getSVGElement().node();
        svg.focus();
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

  .vc-compact-color-item {
    margin-top: 0px !important;
  }

  .highlight {
    stroke: rgb(64, 158, 255);
    /* stroke-width: 3px; */
  }

  .translucent {
    opacity: 0.5;
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
    font-family: "Helvetica Neue", "Source Sans Pro", sans-serif !important;
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

  /*Ghazal End*/

</style>
