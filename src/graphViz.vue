<template>
  <div id="graph-viz">
    <link v-once rel="stylesheet" href="./static/fonts/font-awesome/css/font-awesome.css" />
    <!-- <link v-once rel="stylesheet" href="./static/style.css" /> -->

    <nodeList v-bind:nodesOutside='nodesOutsideDiagram' @clickedNodeInList="addNode($event)"/>
    <toolBar @clickedAction="changeMouseState($event)" />
    <div id="graph"></div>
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

const Rx = require('rxjs');

// This is for the fonts currently used (not font awesome)
// require('./liga.js');

const DELETE = 'DELETE';
const CREATEEDGE = 'CREATEEDGE';
const POINTER = 'POINTER';
const SAVE = 'SAVE';
const ADDNOTE = 'ADDNOTE';

export default {
  props: ['hypothesisId', 'nodes', 'highlightedNodeId', 'savedDiagram'],
  name: 'graph-viz',
  components: { nodeList, toolBar },
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
    const $mouseOverNode = new Rx.Subject();
    this.graph = networkViz('graph', {
      layoutType: 'jaccardLinkLengths',
      edgeLength: 200,
      jaccardModifier: 0.9,
      mouseOverNode: (node) => {
        this.$emit('mouseovernode', node.hash);
        const tempNode = { ...node, mouseOverNode: true };
        $mouseOverNode.next(tempNode);
        // Change the node based on whether or not dragging.
        if (!this.dragging) {
          this.currentNode = node;
        } else {
          this.dragToNode = node;
        }
      },
      mouseOutNode: (node) => {
        this.$emit('mouseoutnode');
        const tempNode = { ...node, mouseOverNode: false };
        $mouseOverNode.next(tempNode);
      },
      canDrag: () => this.mouseState === POINTER,
    });

    this.graph.nodeOptions.setClickNode((node) => {
      if (this.mouseState === DELETE) {
        // Recalculate the nodes after deleting the node.
        this.graph.removeNode(node.hash, this.recalculateNodesOutside);
      }
    });

    /**
    Edge link tool
    */
    const $mousedown = new Rx.Subject();
    this.graph.nodeOptions.setMouseDown((node, selection) => {
      if (this.mouseState === CREATEEDGE) {
        this.currentNode = node;
        $mousedown.next({ type: 'CREATEEDGE', clickedNode: node, selection });
      }
    });
    this.linkTool = linkTool(this.graph, $mousedown, $mouseOverNode, this.toNode);
    this.linkToolDispose = this.linkTool(this.nodes);

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
        const indexOfSubject = this.nodes.map(v => v && v.id).indexOf(x.subject);
        const indexOfObject = this.nodes.map(v => v && v.id).indexOf(x.object);
        if (indexOfSubject === -1 || indexOfObject === -1) {
          return;
        }
        // Create the triplet
        this.graph.addTriplet({
          subject: this.toNode(this.nodes[indexOfSubject]),
          object: this.toNode(this.nodes[indexOfObject]),
          predicate: { type: 'arrow' },
        });
      });
    }
  },
  watch: {
    nodes(current, old) {
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
  },
  methods: {
    toNode(nodeProtocolObject) {
      return {
        hash: `${nodeProtocolObject.id || nodeProtocolObject.hash}`,
        shortname: nodeProtocolObject.text,
        ...nodeProtocolObject,
      };
    },
    addNodes() {
      // Adds all the prop nodes.
      this.nodes.forEach(v => this.graph.addNode(this.toNode(v)));
    },
    addNodeHelper(nodeId, x, y) {
      // Adds nodes, and ignores the node if it can't be found.
      // This lets us optimistically create the diagram.
      const indexOfNode = this.nodes.map(v => v.id).indexOf(nodeId);
      if (indexOfNode !== -1) {
        let node = this.toNode(this.nodes[indexOfNode]);
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
    },
    resetTools() {
      this.linkToolDispose();
      this.linkToolDispose = this.linkTool([...this.nodes, ...this.noteObjs]);
    },
    recalculateNodesOutside() {
      this.nodesOutsideDiagram = this.nodes.filter((v) => {
        const result = !this.graph.hasNode(`${v.id}`);
        return result;
      });
    },
    changeMouseState(state) {
      if (!(state === DELETE
      || state === CREATEEDGE
      || state === POINTER
      || state === SAVE
      || state === ADDNOTE)) {
        console.error('Not sure what state', state, 'is');
      } else {
        this.mouseState = state;
      }
      switch (state) {
        case SAVE: {
          this.mouseState = POINTER;
          this.graph.saveGraph((savedData) => {
            this.$emit('save', savedData, this.graph.getSVGElement().node());
          });
          break;
        }
        case ADDNOTE: {
          this.mouseState = POINTER;
          const node = {
            hash: `note-${this.notes}`,
            shortname: ['Text'],
          };
          this.graph.addNode(node);
          this.notes += 1;
          this.noteObjs = [...this.noteObjs, node];
          this.resetTools();
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
/** This prevents the dirty highlighting of the svg text */
svg text {
    -webkit-user-select: none;
       -moz-user-select: none;
        -ms-user-select: none;
            user-select: none;
}
svg text::selection {
    background: none;
}
</style>
