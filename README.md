# graphviz

[DEMO](http://vue-test-component.surge.sh/)

Click nodes on the left to commit them to the graph.
Use the tools on the right to draw out your graph.

> networkVizJs component

## Very quick rough prototype of structure mapper.

I haven't isolated the component, and have instead left it in an example.

The component has dependencies which are in the static folder (images).

Otherwise the component reacts to the nodes passed in.
If the user clicks save, an event is emitted with the structure saved as a string.
The SVG node is also passed in that event.


## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build

# build for production and view the bundle analyzer report
npm run build --report

# run unit tests
npm run unit

# run e2e tests
npm run e2e

# run all tests
npm test
```

For detailed explanation on how things work, checkout the [guide](http://vuejs-templates.github.io/webpack/) and [docs for vue-loader](http://vuejs.github.io/vue-loader).
