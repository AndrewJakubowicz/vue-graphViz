<template>
<ul>
    <li v-for="item in tools" :key="item.action" @click="clicked(item.action)" v-bind:class="{ active: item.toggled }">
        <span class="icon-alone">
          <i :class="item.icon"></i>
          <span class="screen-reader-text">{{ item.action }}</span>
        </span>
    </li>
</ul>
</template>


<script>
export default {
  name: 'toolBar',
  data() {
    return {
      tools: [
        {
          action: 'POINTER',
          icon: 'icon-mouse-pointer',
          toggled: true,
        },
        {
          action: 'CREATEEDGE',
          icon: 'icon-arrow-up-right',
          toggled: false,
        },
        {
          action: 'DELETE',
          icon: 'icon-bin2',
          toggled: false,
        },
        {
          action: 'SAVE',
          icon: 'icon-floppy-disk',
          toggled: false,
        },
      ],
    };
  },
  methods: {
    clicked(action) {
      this.$emit('clickedAction', action);
      let newAction = action;
      if (action === 'SAVE') {
        newAction = 'POINTER';
      }
      this.tools = this.tools.map(v => ({
        ...v,
        toggled: v.action === newAction,
      }));
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
    font-size: 1.6em;
    color: #222;
    border: 2px solid #eeeeee;
    text-align: center;
}

/** From https://css-tricks.com/html-for-icon-font-usage/ */
.icon-alone {
  padding: 5px;
  display: inline-block; /* Fix for clickability issue in WebKit */
}
.icon-alone:active {
  background-color: #ddd;
}
.active {
  background-color: #ddd;
}
.screen-reader-text { /* Reusable, toolbox kind of class */
  position: absolute;
  top: -9999px;
  left: -9999px;
}
</style>
