// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App.vue'
import * as log from 'loglevel'

Vue.config.productionTip = false;

log.setLevel('info')
Object.defineProperty(Vue.prototype, '$log', { value: log })

const app = new Vue({
  el: '#app',
  template: '<App/>',
  ...App
})

export {app}
