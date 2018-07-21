<template>
  <div>
    <transition name="slide-fade">
      <ul class="graph-unorderedList" @mouseenter="mouseEnter()"
          id="graph-select-tool"
          v-show="tools[tools.reduce((acc,curr, i) => (curr.action === 'SELECT'? i: acc), -1)].toggled">
        <li v-for="item in selectTools" :key="item.action" @click="clicked(item.action)"
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
    </transition>
    <ul class="graph-unorderedList" @mouseenter="mouseEnter()" id="graph-main-tool">
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
  </div>
</template>


<script>
  export default {
    props: ['mouse'],
    name: 'toolBar',
    data() {
      return {
        tools: [
          {
            action: 'POINTER',
            icon: ['mouse-pointer'],
            toggled: true,
            tip: 'Pointer',
          },
          {
            action: 'SELECT',
            icon: ['fw'],
            toggled: false,
            tip: 'Select Tool'
          },
          {
            action: 'ADDNOTE',
            icon: ['plus-square-o'],
            toggled: false,
            tip: 'Add Node',
          },
          {
            action: 'IMPORTPROB',
            icon: ['fas fa-percent'],
            toggled: false,
            tip: 'Import Probability Diagram',
          },
          {
            action: 'UNDO',
            icon: ['undo'],
            toggled: false,
            tip: 'Undo (Ctrl+Z)',
          },
          {
            action: 'REDO',
            icon: ['repeat'],
            toggled: false,
            tip: 'Redo (Ctrl+Y)',
          },
          {
            action: 'SAVE',
            icon: ['floppy-o'],
            toggled: false,
            tip: 'Save',
          },
        ],
        selectTools: [
          {
            action: 'COLOR',
            icon: ['paint-brush'],
            toggled: false,
            tip: 'Color',
          },
          {
            action: 'PIN',
            icon: ['thumb-tack'],
            toggled: false,
            tip: 'Pin'
          },
          {
            action: 'COPY',
            icon: ['copy'],
            toggled: false,
            tip: 'Copy',
          },
          {
            action: 'DELETE',
            icon: ['trash'],
            toggled: false,
            tip: 'Delete (Del)'
          },
          {
            action: 'BOLD',
            icon: ['bold'],
            toggled: false,
            tip: 'Bold  (Ctrl+B)'
          },
          {
            action: 'ITALIC',
            icon: ['italic'],
            toggled: false,
            tip: 'Italics  (Ctrl+I)'
          },
          {
            action: 'UNDERLINE',
            icon: ['underline'],
            toggled: false,
            tip: 'Underline (Ctrl+U)'
          },
        ],
      };
    },
    methods: {
      mouseEnter() {
        this.$emit('mouseEnter');
      },
      clicked(action) {
        this.$emit('clickedAction', action);
        let newAction = action;
        if (action === 'SAVE'
          || action === 'ADDNOTE'
          || action === 'DELETE'
          || action === 'IMPORTPROB'
          || action === 'UNDO'
          || action === 'REDO') {
          // For the above actions, default to mouse pointer state.
          newAction = 'POINTER';
        }
        if (action === 'PIN'
          || action === 'COLOR'
          || action === 'BOLD'
          || action === 'ITALIC'
          || action === 'UNDERLINE'
          || action === 'COPY') {
          // For the above actions, default to mouse select state.
          newAction = 'SELECT';
        }
        this.tools = this.tools.map(v => ({
          ...v,
          toggled: v.action === newAction,
        }));
      },
    },
    watch: {
      mouse(newVal, oldVal) {
        this.tools = this.tools.map(v => ({
          ...v,
          toggled: v.action === newVal,
        }));

      }
    }
  };
</script>

<style scoped>
  .slide-fade-enter-active {
    transition: all .2s ease-out;
  }

  .slide-fade-leave-active {
    transition: all .2s ease-in;
  }

  .slide-fade-enter, .slide-fade-leave-to {
    transform: translate(50px, -70px) scale(1, 0);
  }

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
    -webkit-transition-delay: 0.4s;
    -moz-transition-delay: 0.4s;
    -ms-transition-delay: 0.4s;
    -o-transition-delay: 0.4s;
    transition-delay: 0.4s;
  }

  #graph-main-tool {
    right: 10px;
    top: 10px;
    padding: 5px;
  }

  #graph-select-tool {
    right: 60px;
    top: 16px;
  }

  ul {
    margin: 0;
    padding: 0;
    position: absolute;
    list-style-type: none;
    font-size: 1.6em;
    color: #575959; /* change appearance of toolbar to fit to swarm interface */
    border: 1px solid #bfcbd9;
    border-radius: 4px;
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

  .fa-fw {
    width: 0.8em;
    height: 0.8em;
    border: dotted .1em;
  }

  .fa-stack { /* adjust the gap between the stacked icon and the next */
    height: 1em;
  }
</style>
