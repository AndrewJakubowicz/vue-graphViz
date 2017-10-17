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
      { id: '0', text: 'click me!', class: 'argFor', nodeShape: 'capsule' },
      { id: '1', text: 'text in node', nodeShape: 'rectagle' },
      { id: '2', text: 'id must be unique', nodeShape: 'circle' },
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
      // Checking that save will reset diagram.
      if (this.id === 10) {
        this.savedDiagram = '{"triplets":[{"subject":"0","predicate":"arrow","object":"1"},{"subject":"0","predicate":" ","object":"7"}],"nodes":[{"hash":"0","x":501.098217929378,"y":295.42518949486606},{"hash":"1","x":411.71045105367415,"y":475.0982557363864},{"hash":"7","x":637.9142720001979,"y":148.61255056978771}]}';
      }
      if (this.id > 20) {
        clearInterval(this.interval);
      }
    },
  },
});
