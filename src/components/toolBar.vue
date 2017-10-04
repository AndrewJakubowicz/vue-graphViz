<template>
  <ul class="graph-unorderedList">
    <li v-for="item in tools" :key="item.action" @click="clicked(item.action)"
        v-bind:class="{ active: item.toggled }">
        <span v-if="item.icon.length === 1" class="icon-alone tooltip">
          <i :class="'fa fa-' + item.icon[0] + ' fa-lg'"></i>
          <span class="screen-reader-text">{{ item.action }}</span>
          <span class="tooltiptext">{{item.tip}}</span>
        </span>
      <span v-else class="fa-stack fa-sm tooltip">
            <i :class="item.icon[0]"></i>
            <i :class="item.icon[1]"></i>
            <span class="screen-reader-text">{{ item.action }}</span>
        <span class="tooltiptext">{{item.tip}}</span>
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
            icon: ['mouse-pointer'],
            toggled: true,
            tip: "Pointer"
          },
          {
            action: 'CREATEEDGE',
            icon: ['arrow-right'],
            toggled: false,
            tip: "Create Edge"
          },
//          {
//            action: 'DELETE',
//            icon: ['trash'],
//            toggled: false,
//            tip: "Delete"
//          },
//          {
//            action: 'PIN', /* to pin down nodes to the screen */
//            icon: ['thumb-tack'],
//            toggled: false,
//            tip: "Pin"
//          },
          {
            action: 'ADDNOTE',
            icon: ['plus-square-o'],
            toggled: false,
            tip: "Add Node"
          },
          {
            action: 'REMOVEARROWS', /* to remove all arrows from the screen */
            icon: ['fa fa-arrow-circle-o-right fa-stack-2x', 'fa fa-ban fa-stack-2x text-danger'],
            toggled: false,
            tip: "Delete Edges"
          },
          {
            action: 'CLEARSCREEN', /* to remove all nodes and arrows from the screen */
//            icon: ['fa fa-share-alt fa-rotate-90 fa-stack-1x', 'fa fa-ban fa-stack-2x text-danger'],
            icon: ['close'],
            toggled: false,
            tip: "Delete All"
          },
          {
            action: 'SAVE',
            icon: ['floppy-o'],
            toggled: false,
            tip: "Save"
          },
        ],
      };
    },
    methods: {
      clicked(action) {
        this.$emit('clickedAction', action);
        let newAction = action;
        if (action === 'SAVE'
          || action === 'ADDNOTE'
          || action === 'CLEARSCREEN'
          || action === 'REMOVEARROWS') {
          // For the above actions, default to mouse pointer state.
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

  .tooltip {
    position: relative;
    display: inline-block;
    /*border-bottom: 1px dotted black;*/
  }

  .tooltip .tooltiptext {
    visibility: hidden;
    width: 80px;
    background-color: #f5fafa;
    color: black;
    text-align: center;
    border-radius: 6px;
    padding: 2px 0;
    font-size: 12px;
    /* Position the tooltip */
    position: absolute;
    z-index: 1;
    top: -5px;
    right: 105%;
  }

  .tooltip:hover .tooltiptext {
    visibility: visible;
  }

  ul {
    margin: 0;
    padding: 0;
    position: absolute;
    right: 10px;
    top: 10px;
    list-style-type: none;
    font-size: 1.6em;
    color: grey;
    border: 2px solid #eeeeee;
    text-align: center;
  }

  /** From https://css-tricks.com/html-for-icon-font-usage/ */
  .icon-alone {
    padding: 5px;
    display: inline-block; /* Fix for clickability issue in WebKit */
  }

  .active {
    color: #20a0ff;
  }

  .screen-reader-text { /* Reusable, toolbox kind of class */
    position: absolute;
    top: -9999px;
    left: -9999px;
  }

  .fa-sm { /* Translates the stacked icons to the same size as the other ones */
    font-size: 0.75em;
  }
</style>
