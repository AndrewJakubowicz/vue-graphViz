<template>
  <div>
    <transition name="slide-fade">
      <ul @mouseenter="mouseEnter()" class="graph-unorderedList"
          id="graph-select-tool"
          v-show="tools[tools.reduce((acc,curr, i) => (curr.action === 'SELECT'? i: acc), -1)].toggled">
        <li :key="item.action" @click="clicked(item.action)" v-bind:class="{ active: item.toggled }"
            v-for="item in selectTools">
          <span class="icon-alone tooltip">
            <fa-icon :icon="[item.iconStyle, item.icon]" fixed-width></fa-icon>
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
            <fa-icon :icon="[item.iconStyle, item.icon]" fixed-width></fa-icon>
          <span class="screen-reader-text">{{ item.shape }}</span>
          </span>
        </li>
      </ul>
    </transition>

    <ul @mouseenter="mouseEnter()" class="graph-unorderedList" id="graph-main-tool">
      <li :key="item.action" @click="clicked(item.action)" v-bind:class="{ active: item.toggled }"
          v-for="item in tools">
        <span class="icon-alone tooltip" v-if="item.action==='ADDNOTE'" ref="addNodeButton">
          <fa-icon :icon="addNoteIcon" :mask="addNoteMask" fixed-width></fa-icon>
          <span class="screen-reader-text">{{ item.action }}</span>
          <span class="tooltiptext">{{item.tip}}</span>
        </span>
        <span class="icon-alone tooltip" v-else>
          <fa-icon :icon="[item.iconStyle, item.icon]" fixed-width></fa-icon>
          <span class="screen-reader-text">{{ item.action }}</span>
          <span class="tooltiptext">{{item.tip}}</span>
        </span>

      </li>
    </ul>
  </div>
</template>


<script>
  import { library } from '@fortawesome/fontawesome-svg-core';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import {
    faMousePointer,
    faExpand,
    faPercent,
    faUndo,
    faRedo,
    faThumbtack,
    faBold,
    faItalic,
    faUnderline,
    faCircle,
    faSquare,
    faSquareFull,
    faPlus,
    faPlusSquare as fasPlusSquare,
  } from '@fortawesome/free-solid-svg-icons';
  import { faSave,
    faFolderOpen,
    faCopy,
    faTrashAlt,
    faObjectGroup,
    faPlusSquare as farPlusSquare,
  } from '@fortawesome/free-regular-svg-icons';

  library.add(faMousePointer, faExpand, faPercent, faUndo, faRedo, faThumbtack, faBold,
    faItalic, faUnderline, faCircle, faSquare, faSquareFull, faSave, faFolderOpen,
    faCopy, faTrashAlt, faObjectGroup, fasPlusSquare, faPlus, farPlusSquare);

  export default {
    props: ['mouse', 'shape'],
    name: 'toolBar',
    components: { faIcon: FontAwesomeIcon },
    data() {
      return {
        tools: [
          {
            action: 'POINTER',
            icon: 'mouse-pointer',
            iconStyle: 'fas',
            toggled: true,
            tip: 'Pointer (P)',
          },
          {
            action: 'SELECT',
            icon: 'expand',
            iconStyle: 'fas',
            toggled: false,
            tip: 'Select Tool (S)',
          },
          {
            action: 'ADDNOTE',
            toggled: false,
            tip: 'Add Node',
            mask: this.addNoteMask,
          },
          {
            action: 'IMPORTPROB',
            icon: 'percent',
            iconStyle: 'fas',
            toggled: false,
            tip: 'Import Probability Diagram',
          },
          {
            action: 'UNDO',
            icon: 'undo',
            iconStyle: 'fas',
            toggled: false,
            tip: 'Undo (Ctrl+Z)',
          },
          {
            action: 'REDO',
            icon: 'redo',
            iconStyle: 'fas',
            toggled: false,
            tip: 'Redo (Ctrl+Y)',
          },
          {
            action: 'OPEN',
            icon: 'folder-open',
            iconStyle: 'far',
            toggled: false,
            tip: 'Open (Ctrl+O)',
          },
          {
            action: 'SAVE',
            icon: 'save',
            iconStyle: 'far',
            toggled: false,
            tip: 'Save (Ctrl+S)',
          },
        ],
        selectTools: [
          // {
          //   action: 'COLOR',
          //   icon: 'paint-brush',
          //   iconStyle: 'fas',
          //   toggled: false,
          //   tip: 'Color',
          // },
          {
            action: 'PIN',
            icon: 'thumbtack',
            iconStyle: 'fas',
            toggled: false,
            tip: 'Pin',
          },
          {
            action: 'COPY',
            icon: 'copy',
            iconStyle: 'far',
            toggled: false,
            tip: 'Duplicate (Ctrl+C)',
          },
          {
            action: 'DELETE',
            icon: 'trash-alt',
            iconStyle: 'far',
            toggled: false,
            tip: 'Delete (Del)',
          },
          {
            action: 'BOLD',
            icon: 'bold',
            iconStyle: 'fas',
            toggled: false,
            tip: 'Bold  (Ctrl+B)',
          },
          {
            action: 'ITALIC',
            icon: 'italic',
            iconStyle: 'fas',
            toggled: false,
            tip: 'Italics  (Ctrl+I)',
          },
          {
            action: 'UNDERLINE',
            icon: 'underline',
            iconStyle: 'fas',
            toggled: false,
            tip: 'Underline (Ctrl+U)',
          },
          {
            action: 'GROUP',
            icon: 'object-group',
            iconStyle: 'far',
            toggled: false,
            tip: 'Group',
          },
        ],
        shapes: [
          {
            shape: 'circle',
            icon: 'circle',
            iconStyle: 'fas',
            tip: 'Circle',
          },
          {
            shape: 'rect',
            icon: 'square-full',
            iconStyle: 'fas',
            tip: 'Rectangle',
          },
          {
            shape: 'capsule',
            icon: 'square',
            iconStyle: 'fas',
            tip: 'Rounded Rectangle',
          },
        ],
        showShapeMenu: false,
        shapeToolVisibility: 'hidden',
        addNoteMask: undefined,
        addNoteIcon: ['far', 'plus-square'],
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
        switch (newVal) {
          case 'circle': {
            this.addNoteIcon = 'plus';
            this.addNoteMask = 'circle';
            break;
          }
          case 'rect': {
            this.addNoteIcon = 'plus';
            this.addNoteMask = 'square-full';
            break;
          }
          case 'capsule': {
            this.addNoteIcon = 'plus-square';
            this.addNoteMask = undefined;
            break;
          }
          default: {
            this.addNoteIcon = ['far', 'plus-square'];
            this.addNoteMask = undefined;
            break;
          }
        }
      },
      mouseOutShapeCheck(event) {
        if (event.clientX < this.bb.x - (1.5 * this.bb.width) - this.bt.width
          || event.clientX > this.bb.x + (1.5 * this.bb.width)
          || event.clientY < this.bb.y - (0.5 * this.bt.height)
          || event.clientY > this.bb.y + this.bt.height
        ) {
          this.showShapeMenu = false;
        }
      },
      changeDefaultShape(e) {
        this.$emit('changeDefaultShape', e);
        this.showShapeMenu = false;
      },
      mouseOverShapeIcon() {
        if (!this.showShapeMenu) {
          this.showShapeMenu = true;
        }
      },
    },
    watch: {
      mouse(newVal) {
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
      },
    },
    mounted() {
      this.changeShapeIcon(this.shape);
      this.addNodeButton = this.$refs.addNodeButton[0];
      this.shapeTool = document.getElementById('graph-shape-tool');
      this.addNodeButton.addEventListener('mouseenter', this.mouseOverShapeIcon);
    },
    beforeDestroy() {
      this.addNodeButton.removeEventListener('mouseenter', this.mouseOverShapeIcon);
      document.removeEventListener('mousemove', this.mouseOutShapeCheck);
    },
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

  .graph-unorderedList {
    background: white;
  }
</style>
