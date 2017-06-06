<template>
  <div id="graph-viz">
    <link v-once rel="stylesheet" href="./static/style.css">
    <nodeList v-bind:nodesOutside='nodesOutsideDiagram' @clickedNodeInList="addNode($event)"/>
    <toolBar @clickedAction="changeMouseState($event)"/>
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

require('./liga.js');

const DELETE = 'DELETE';
const CREATEEDGE = 'CREATEEDGE';
const POINTER = 'POINTER';
const SAVE = 'SAVE';

export default {
  props: ['hypothesisId', 'nodes', 'highlightedNodeId', 'savedDiagram'],
  name: 'graph-viz',
  components: { nodeList, toolBar },
  data() {
    return {
      graph: undefined,
      nodesOutsideDiagram: [],
      mouseState: POINTER,
      currentNode: undefined,
      dragToNode: undefined,
      dragging: false,
    };
  },
  mounted() {
    this.graph = networkViz('graph', {
      layoutType: 'jaccardLinkLengths',
      edgeLength: 200,
      jaccardModifier: 0.9,
      mouseOverNode: (node) => {
        this.$emit('mouseovernode', node.hash);
        // Change the node based on whether or not dragging.
        if (!this.dragging) {
          this.currentNode = node;
        } else {
          this.dragToNode = node;
        }
      },
      mouseOutNode: () => {
        this.$emit('mouseoutnode');
      },
      canDrag: () => this.mouseState === POINTER,
    });

    this.graph.nodeOptions.setMouseDown((node) => {
      if (this.mouseState === CREATEEDGE) {
        this.dragging = true;
        this.currentNode = node;
      }
    });
    // This is to help with edge creation.
    this.graph.getSVGElement().node().addEventListener('mouseup', () => {
      if (this.dragging) {
        if (this.currentNode.hash !== this.dragToNode.hash) {
          this.graph.addTriplet({
            subject: this.currentNode,
            predicate: { type: 'arrow' },
            object: this.dragToNode,
          });
        }
        // do the work.
      } else {
        console.log('Do nothing');
      }
    });

    this.graph.nodeOptions.setClickNode((node) => {
      if (this.mouseState === DELETE) {
        // Recalculate the nodes after deleting the node.
        this.graph.removeNode(node.hash, this.recalculateNodesOutside);
      }
    });

    // Create initial diagram from createDiagram.
    if (this.savedDiagram) {
      // Create from saved.
      const savedGraph = JSON.parse(this.savedDiagram);
      const nodes = savedGraph.nodes;
      nodes.forEach((v) => {
        // Append x and y co-ordinates to the nodes passed in.
        this.addNodeHelper(parseInt(v.hash, 10), v.x, v.y);
      });
      const triplets = savedGraph.triplets;
      triplets.forEach((x) => {
        // Create the triplets between the nodes.
        const indexOfSubject = this.nodes.map(v => v && v.id).indexOf(parseInt(x.subject, 10));
        const indexOfObject = this.nodes.map(v => v && v.id).indexOf(parseInt(x.object, 10));
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
      // this.addNodes();
      this.graph.saveGraph((s) => { console.log(s); });
      // Remove any nodes that have been removed.
      const newIds = new Set(current.map(v => v.id));
      old.forEach((v) => {
        if (!newIds.has(v.id)) {
          this.graph.removeNode(v.id.toString());
        }
      });

      // Nodes that are passed in but aren't drawn go in the list.
      this.recalculateNodesOutside();
    },
  },
  methods: {
    toNode(nodeProtocolObject) {
      return {
        hash: nodeProtocolObject.id.toString(),
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
    },
    addNode(nodeId) {
      this.addNodeHelper(nodeId);
    },
    recalculateNodesOutside() {
      this.nodesOutsideDiagram = this.nodes.filter((v) => {
        const result = !this.graph.hasNode(v.id.toString());
        return result;
      });
    },
    changeMouseState(state) {
      if (!(state === DELETE || state === CREATEEDGE || state === POINTER || state === SAVE)) {
        console.error('Not sure what state', state, 'is');
      } else {
        this.mouseState = state;
      }
      if (state === SAVE) {
        this.mouseState = POINTER;
        this.graph.saveGraph((savedData) => {
          this.$emit('save', savedData);
        });
      }
    },
  },
};
</script>

<style>

</style>
