<template>
<ul>
    <li v-for="item in nodesOutside" @click="clicked(item.id)">
        {{ item.text }}
    </li>
</ul>
</template>


<script>
export default {
  name: 'nodeList',
  props: ['nodesOutside'],
  data() {
    return {
    };
  },
  methods: {
    clicked(id) {
      this.$emit('clickedNodeInList', id);
    },
  },
};
</script>

<style scoped>
ul {
    margin: 0;
    padding: 0;
    position: absolute;
    left: 10px;
    top: 10px;
    list-style-type: none;
}
</style>
