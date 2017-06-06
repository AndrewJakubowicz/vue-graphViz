<template>
  <div id="graph-viz">
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

const DELETE = 'DELETE';
const CREATEEDGE = 'CREATEEDGE';
const POINTER = 'POINTER';

export default {
  props: ['hypothesisId', 'nodes', 'highlightedNodeId', 'savedDiagram'],
  name: 'graph-viz',
  components: { nodeList, toolBar },
  data() {
    return {
      graph: undefined,
      nodesOutsideDiagram: [],
      mouseState: POINTER,
    };
  },
  mounted() {
    this.graph = networkViz('graph', {
      databaseName: this.hypothesisId.toString(),
      mouseOverNode: (node) => {
        this.$emit('mouseovernode', node.hash);
      },
      mouseOutNode: () => {
        this.$emit('mouseoutnode');
      },
      canDrag: () => this.mouseState === POINTER,
    });

    this.graph.nodeOptions.setClickNode((node) => {
      if (this.mouseState === DELETE) {
        // Recalculate the nodes after deleting the node.
        this.graph.removeNode(node.hash, this.recalculateNodesOutside);
      }
    });

    // TODO: create from savedDiagram.
    if (this.savedDiagram) {
      // Create from saved.
      const savedGraph = JSON.parse(this.savedDiagram);
      const nodes = savedGraph.nodes;
      nodes.forEach((v) => {
        // Append x and y co-ordinates to the nodes passed in.
        this.addNodeHelper(parseInt(v.hash, 10), v.x, v.y);
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
      if (indexOfNode !== undefined) {
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
      if (!(state === DELETE || state === CREATEEDGE || state === POINTER)) {
        console.error('Not sure what state', state, 'is');
      } else {
        this.mouseState = state;
      }
    },
  },
};
</script>

<style>

</style>
