<template>
<ul class="listOfNodes">
    <li v-for="item in nodesOutside" :key="item.hash" @click="clicked(item.id)" :class="classObject(item.class)">
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
    interact(id) {
      this.$emit('clickedNodeInList', id);
    },
    classObject(spaceSeparatedClasses) {
      // This is hackey
      if (!spaceSeparatedClasses) {
        return 'nodeList-noClass';
      }
      const classes = spaceSeparatedClasses.split(' ');
      const classObj = {};
      for (let i = 0; i < classes.length; i += 1) {
        classObj[classes[i]] = true;
      }
      return classObj;
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
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
}
</style>
