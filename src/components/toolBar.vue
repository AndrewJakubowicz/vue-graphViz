<template>
<ul>
    <li v-for="item in tools" @click="clicked(item.action)">
        {{ item.icon }}
    </li>
</ul>
</template>


<script>
export default {
  name: 'toolBar',
  data() {
    return {
      tools: {
        delete: {
          action: 'DELETE',
          icon: 'iconurl',
        },
      },
    };
  },
  methods: {
    clicked(action) {
      this.$emit('clickedAction', action);
    },
  },
};
</script>

<style scoped>
ul {
    margin: 0;
    padding: 0;
    position: absolute;
    right: 10px;
    top: 10px;
    list-style-type: none;
}
</style>
