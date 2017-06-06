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
      { id: 0, text: 'randomText1' },
      { id: 1, text: 'randomText2' },
      { id: 2, text: 'randomText3' },
      { id: 3, text: 'randomText4' },
    ],
    savedDiagram: '{"triplets":[],"nodes":[{"hash":"1","x":617.8570251464844,"y":192.78387490625371},{"hash":"3","x":449.0095259474512,"y":356.4779992207068},{"hash":"2","x":395.623779296875,"y":183.01881548144902}]}',
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
