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

export default {
  props: ['hypothesisId', 'nodes', 'highlightedNodeId', 'savedDiagram'],
  name: 'graph-viz',
  components: { nodeList, toolBar },
  data() {
    return {
      graph: undefined,
      nodesOutsideDiagram: [],
      mouseState: '',
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
    });

    // TODO: create from savedDiagram.
    if (this.savedDiagram) {
      // Create from saved.
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
      return { hash: nodeProtocolObject.id.toString(), shortname: nodeProtocolObject.text };
    },
    addNodes() {
      // Adds all the prop nodes.
      this.nodes.forEach(v => this.graph.addNode(this.toNode(v)));
    },
    addNode(nodeId) {
      const indexOfNode = this.nodes.map(v => v.id).indexOf(nodeId);
      if (indexOfNode !== undefined) {
        this.graph.addNode(this.toNode(this.nodes[indexOfNode]));
      }
      this.recalculateNodesOutside();
    },
    recalculateNodesOutside() {
      this.nodesOutsideDiagram = this.nodes.filter((v) => {
        const result = !this.graph.hasNode(v.id.toString());
        return result;
      });
    },
    changeMouseState(state) {
      if (!(state === DELETE || state === CREATEEDGE)) {
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
