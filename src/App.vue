<template>
  <div>
    <graphViz id="xb-arg-map"
              class="b-arg-map"
              :hypothesisId="chunkId"
              :nodes="nodes"
              :textNodes="textNodes"
              :savedDiagram="savedDiagram"
              @save="save"
              :width="width" :height="height"
    ></graphViz>
  </div>
</template>
<script>
  import graphViz from './graphViz.vue'
  export default {
    props: ['snippets', 'w', 'graphChunk', 'chunk'],
    data() {
      return {
        chunkId: null,
        width: 300,
        height: 500,
        id: 3,
        h: 0,
        nodes: [],
        textNodes: [],
        savedDiagram: ''
      }
    },
    watch: {
      w() {
        this.$log.info('graph - width changed', this.w)
        this.width = this.w
      }
    },
    created() {
      this.$log.info('graph - created', this.w, this)
      this.chunkId = this.chunk.id
      this.parse()
    },
    mounted() {
      this.height = document.getElementById('xb-arg-map').clientHeight
      this.width = document.getElementById('xb-arg-map').clientWidth
      this.$log.info('graph - height changed', this.height)
    },
    methods: {

      parse() {
        let saved = null
        let textNodes = []
        let graph = this.graphChunk && this.graphChunk.content

        if (graph && this.graphChunk.deleted) graph = null
        else if (graph && !graph.deleted && graph.length > 0) {
          try {
            graph = JSON.parse(graph)
            saved = graph.saved
            textNodes = graph.textNodes
          } catch (e) {
            // pass
          }
        }
        this.savedDiagram = saved || '{"triplets":[{"subject":"0","predicate":"arrow","object":"1"}],"nodes":[{"hash":"0","x":223.3129297153952,"y":46.94835315445652},{"hash":"1","x":414.12654824652196,"y":106.86632193726514},{"hash":"2","x":393.53570556640625,"y":182.36602783203125}]}'
        this.nodes = this.snippets

        if (!textNodes || textNodes.length === 0) {
          this.textNodes = this.nodes
        } else {
          this.textNodes = textNodes
        }
      },
      save(savedDiagram, svg, textNodes) {
        let graph = JSON.stringify({
          saved: savedDiagram,
          svg: svg.outerHTML,
          textNodes: textNodes
        })
        let payload = {
          graphChunk: this.graphChunk,
          chunk: this.chunk,
          id: this.chunkId,
          graph: graph
        }
        this.$log.info('graph - saved', payload, JSON.parse(savedDiagram))
        this.$emit('save', payload)
      }
    },
    components: {graphViz}
  }

</script>

<style>
  .b-arg-map .fa {
    font-size: 16px !important;
  }

  text {
    font-family: "Source Sans Pro", sans-serif !important;
    font-weight: 100 !important;
  }

  .b-arg-map .graph-unorderedList li {
    vertical-align: middle !important;
    text-align: center !important;
    font-size: 16px !important;
    cursor: pointer;
  }

  .b-arg-map .graph-unorderedList li > span {
    font-size: 16px !important;
    padding: 5px !important;
  }

</style>

<style scoped>
  .b-arg-map {
    left: 0;
    position: absolute;
    width: 100%;
    height: 100%;
  }


</style>
