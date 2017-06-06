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
      { id: 0, text: 'click me!' },
      { id: 1, text: 'text in node' },
      { id: 2, text: 'id must be unique' },
      { id: 3, text: 'randomText4' },
    ],
    savedDiagram: '{"triplets":[{"subject":"1","predicate":"arrow","object":"2"}],"nodes":[{"hash":"1","x":645.9672679901261,"y":204.8057758227204},{"hash":"3","x":449.0095259474512,"y":356.4779992207068},{"hash":"2","x":446.7203845977645,"y":187.46566456498223}]}',
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
      this.arrayOfNodes = [...this.arrayOfNodes, { id: this.id, text: `randomText${this.id + 1}` }];
      if (this.id > 20) {
        clearInterval(this.interval);
      }
    },
  },
});
