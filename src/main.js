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
    id: 0,
    arrayOfNodes: [
      { id: 0, text: 'randomText1' },
    ],
  },
  mounted() {
    this.start();
  },
  template: '<graphViz v-bind:hypothesisId="903218312" v-bind:nodes="arrayOfNodes"/>',
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
