// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue';
import graphViz from './graphViz';

Vue.config.productionTip = false;

/* eslint-disable no-new */
new Vue({
  el: '#app',
  data: {
    interval: undefined,
    id: 3,
    arrayOfNodes: [
      { id: '0', text: 'click me!' },
      { id: '1', text: 'text in node' },
      { id: '2', text: 'id must be unique' },
      { id: '3', text: 'randomText4' },
    ],
    savedDiagram: '{"triplets":[{"subject":"0","predicate":"arrow","object":"1"}],"nodes":[{"hash":"0","x":223.3129297153952,"y":46.94835315445652},{"hash":"1","x":414.12654824652196,"y":106.86632193726514},{"hash":"2","x":393.53570556640625,"y":182.36602783203125}]}',
  },
  mounted() {
    this.start();
  },
  template: '<graphViz v-bind:hypothesisId="903218312" v-bind:nodes="arrayOfNodes" :savedDiagram="savedDiagram" />',
  components: { graphViz },
  methods: {
    start() {
      this.tick();
      this.interval = setInterval(this.tick, 3000);
    },
    tick() {
      this.id += 1;
      this.arrayOfNodes = [...this.arrayOfNodes, { id: `${this.id}`, text: `randomText${this.id + 1}` }];
      // Remove a node for fun.
      // When id = 6, delete node 2.
      if (this.id === 6) {
        this.arrayOfNodes = this.arrayOfNodes.filter(v => v.id !== '2');
      }
      if (this.id > 20) {
        clearInterval(this.interval);
      }
    },
  },
});
