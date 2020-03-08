# graphviz

### Try it [here](https://andrewjakubowicz.github.io/vue-graphViz/)
#### https://andrewjakubowicz.github.io/vue-graphViz

Use the toolbar on the right to draw out your graph.
You can double click to create nodes easily.
Multiple objects can be selected and manipulated at once through the selection tool (second from top in toolbar)
Typical keyboard shortcuts are supported

## networkVizJs
This component is built using the networkVizJS API
See: [Project Link](https://github.com/AndrewJakubowicz/networkVizJS)

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
