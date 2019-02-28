<template>
  <div>
    <transition name="slide-fade">
      <ul @mouseenter="mouseEnter()" class="graph-unorderedList"
          id="graph-select-tool"
          v-show="tools[tools.reduce((acc,curr, i) => (curr.action === 'SELECT'? i: acc), -1)].toggled">
        <li :key="item.action" @click="clicked(item.action)" v-bind:class="{ active: item.toggled }"
            v-for="item in selectTools">
          <span class="icon-alone tooltip" v-if="item.icon.length === 1">
          <i :class="'fa fa-' + item.icon[0] + ' fa-lg'"></i>
          <span class="screen-reader-text">{{ item.action }}</span>
          <span class="tooltiptext">{{item.tip}}</span>
          </span>
          <span class="fa-stack fa-sm tooltip" v-else>
            <i :class="item.icon[0]"></i>
            <i :class="item.icon[1]"></i>
            <span class="screen-reader-text">{{ item.action }}</span>
            <span class="tooltiptext">{{item.tip}}</span>
          </span>
        </li>
      </ul>
    </transition>

    <transition name="slide-fade-right">
      <ul @mouseenter="mouseEnter()" class="graph-unorderedList" id="graph-shape-tool"
          :style="{visibility:shapeToolVisibility}">
        <li :key="item.shape" @click="changeDefaultShape(item.shape)" v-bind:class="{ active: shape===item.shape }"
            v-for="item in shapes">
          <span class="icon-alone tooltip">
            <svg width="16px" height="18px" class="icon-alone">
              <use style="transform:scale(0.03571);"
                   :xlink:href="item.icon"></use>
            </svg>
          <span class="screen-reader-text">{{ item.shape }}</span>
          </span>
        </li>
      </ul>
    </transition>

    <ul @mouseenter="mouseEnter()" class="graph-unorderedList" id="graph-main-tool">
      <li :key="item.action" @click="clicked(item.action)" v-bind:class="{ active: item.toggled }"
          v-for="item in tools">
        <span class="icon-alone tooltip" v-if="item.custom" v-html="item.html">
          <span class="screen-reader-text">{{ item.action }}</span>
          <span class="tooltiptext">{{item.tip}}</span>
        </span>
        <span class="icon-alone tooltip" v-else-if="item.icon.length === 1">
          <i :class="'fa fa-' + item.icon[0] + ' fa-lg'"></i>
          <span class="screen-reader-text">{{ item.action }}</span>
          <span class="tooltiptext">{{item.tip}}</span>
        </span>
        <span class="fa-stack fa-sm tooltip" v-else>
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
  import fa5Icons from '../assets/fa5-icons.svg';

  export default {
    props: ['mouse', 'shape'],
    name: 'toolBar',
    data() {
      return {
        tools: [
          {
            action: 'POINTER',
            icon: ['mouse-pointer'],
            toggled: true,
            tip: 'Pointer (P)',
          },
          {
            action: 'SELECT',
            toggled: false,
            tip: 'Select Tool (S)',
            custom: true,
            html: `<svg width="16px" height="18px" class="icon-alone"><use style="transform:scale(0.03571);" xlink:href=.${fa5Icons}#expand></use></svg>`,
          },
          {
            action: 'ADDNOTE',
            icon: ['plus-square'],
            toggled: false,
            tip: 'Add Node',
            custom: true,
            html: `<svg id="addNodeButton" width="16px" height="18px" class="icon-alone"><use id="addNodeIcon" style="transform:scale(0.03571);" xlink:href=.${fa5Icons}#plus-square-regular></use></svg>`,
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
            action: 'OPEN',
            icon: ['folder-open-o'],
            toggled: false,
            tip: 'Open (Ctrl+O)',
          },
          {
            action: 'SAVE',
            icon: ['floppy-o'],
            toggled: false,
            tip: 'Save (Ctrl+S)',
          },
        ],
        selectTools: [
          // {
          //   action: 'COLOR',
          //   icon: ['paint-brush'],
          //   toggled: false,
          //   tip: 'Color',
          // },
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
            tip: 'Duplicate (Ctrl+C)',
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
          {
            action: 'GROUP',
            icon: ['fas fa-object-group'],
            toggled: false,
            tip: 'Group',
          },
        ],
        shapes: [
          {
            shape: 'circle',
            icon: `.${fa5Icons}#circle-solid`,
            tip: 'Circle',
          },
          {
            shape: 'rect',
            icon: `.${fa5Icons}#rect-solid`,
            tip: 'Rectangle',
          },
          {
            shape: 'capsule',
            icon: `.${fa5Icons}#capsule-solid`,
            tip: 'Rounded Rectangle',
          },
        ],
        showShapeMenu: false,
        shapeToolVisibility: 'hidden',
        addNodeButton: undefined,
        bb: undefined,
        bt: undefined,
      };
    },
    methods: {
      mouseEnter() {
        this.$emit('mouseEnter');
      },
      clicked(action) {
        this.showShapeMenu = false;
        this.$emit('clickedAction', action);
        let newAction = action;
        if (action === 'SAVE'
          || action === 'ADDNOTE'
          || action === 'DELETE'
          || action === 'IMPORTPROB'
          || action === 'UNDO'
          || action === 'COPY'
          || action === 'OPEN'
          || action === 'REDO') {
          // For the above actions, default to mouse pointer state.
          newAction = 'POINTER';
        }
        if (action === 'PIN'
          || action === 'COLOR'
          || action === 'BOLD'
          || action === 'ITALIC'
          || action === 'GROUP'
          || action === 'UNDERLINE') {
          // For the above actions, default to mouse select state.
          newAction = 'SELECT';
        }
        this.tools = this.tools.map(v => ({
          ...v,
          toggled: v.action === newAction,
        }));
      },
      changeShapeIcon(newVal) {
        let iconID;
        switch (newVal) {
          case 'circle': {
            iconID = 'plus-circle-solid';
            break;
          }
          case 'rect': {
            iconID = 'plus-rect-solid';
            break;
          }
          case 'capsule': {
            iconID = 'plus-capsule-solid';
            break;
          }
          default: {
            iconID = 'plus-square-regular';
            break;
          }
        }
        const elem = document.getElementById('addNodeIcon');
        elem.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', `.${fa5Icons}#${iconID}`);
      },
      mouseOutShapeCheck(event) {
        if (event.clientX < this.bb.x - 1.5 * this.bb.width - this.bt.width
          || event.clientX > this.bb.x + 1.5 * this.bb.width
          || event.clientY < this.bb.y - 0.5 * this.bt.height
          || event.clientY > this.bb.y + this.bt.height
        ) {
          this.showShapeMenu = false;
        }
      },
      changeDefaultShape(e) {
        this.$emit('changeDefaultShape', e);
        this.showShapeMenu = false;
      },
      mouseOverShapeIcon(e) {
        if (!this.showShapeMenu) {
          this.showShapeMenu = true;
        }
      }
    },
    watch: {
      mouse(newVal, oldVal) {
        this.tools = this.tools.map(v => ({
          ...v,
          toggled: v.action === newVal,
        }));
      },
      shape: 'changeShapeIcon',
      showShapeMenu(displayed) {
        if (displayed) {
          this.shapeToolVisibility = 'visible';
          this.bb = this.addNodeButton.getBoundingClientRect();
          this.bt = this.shapeTool.getBoundingClientRect();
          document.addEventListener('mousemove', this.mouseOutShapeCheck);
        } else {
          document.removeEventListener('mousemove', this.mouseOutShapeCheck);
          this.shapeToolVisibility = 'hidden';

        }
      }
    },
    mounted() {
      this.changeShapeIcon(this.shape);
      this.addNodeButton = document.getElementById('addNodeButton');
      this.shapeTool = document.getElementById('graph-shape-tool');
      this.addNodeButton.addEventListener('mouseenter', this.mouseOverShapeIcon);
    },
    beforeDestroy() {
      this.addNodeButton.removeEventListener('mouseenter', this.mouseOverShapeIcon);
      document.removeEventListener('mousemove', this.mouseOutShapeCheck);
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
    transform: translate(50px) scale(1, 0);
  }

  .slide-fade-right-enter, .slide-fade-right-leave-to {
    transform: translate(50px) scale(1, 0);
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

  #graph-shape-tool {
    right: 47px;
    top: 70px;
    display: inline-flex;
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

  .fa-stack { /* adjust the gap between the stacked icon and the next */
    height: 1em;
  }

  .graph-unorderedList {
    background: white;
  }
</style>
