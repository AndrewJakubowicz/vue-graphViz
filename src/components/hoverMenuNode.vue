<template>
  <div id="graph-hover-menu" ref="parent"
       :style="{top:`${posPad.y + posPad.height/2}px`, left:`${posPad.x + posPad.width/2}px`}"
       v-show="display">

    <!--SVG to detect mouse leave-->
    <!--Useful to debug mouse limit size-->
    <!--<svg id="hover-back" :style="hoverBackPos">-->
    <!--<rect id="hover-rect" rx="50" ry="40" width="0" height="0"-->
    <!--:style="hoverRectPos"></rect>-->
    <!--</svg>-->

    <!--TOP ICONS-->
    <div class="icon-position h-center-align" :style="{bottom:`${posPad.height/2-15}px`}"
         v-show="type==='grup' && showTextBar">
      <div class="rectangle" :style="{width: `${posPad.width/3*2}px`}" @mouseenter="interact('TEXT', $event)">
        <div class="circle-wrapper">
          <div class="circle"></div>
          <div class="circle"></div>
          <div class="circle"></div>
        </div>
      </div>
    </div>

    <!--BOTTOM ICONS-->
    <div class="icon-position h-center-align hand" :style="{top: `${posPad.height/2}px`}" style="width: 60px">
      <div class="icon-wrapper menu-color hand">
        <fa-icon icon="paint-brush" class="bgpicker" :style="{color}" @click="interact('COLOR', $event)"></fa-icon>
      </div>
      <div class="icon-wrapper hand">
        <fa-icon :icon="['far', 'trash-alt']" class="custom-icon" @click="interact('DELETE', $event)"></fa-icon>
      </div>
    </div>

    <!--RIGHT ICONS-->
    <div class="icon-position v-center-align hand" :style="{left: `${posPad.width/2}px`}" v-show="type==='note'">
      <div class="icon-wrapper">
        <fa-icon icon="arrow-right" class="custom-icon" @mousedown="interact('CREATEEDGE', $event)"></fa-icon>
      </div>
      <div class="icon-wrapper">
        <fa-icon icon="thumbtack" :class="pinned" @click="interact('PIN', $event)"></fa-icon>
      </div>
    </div>

    <!--Resize Drag // TODO better solution-->
    <div class="icon-position" :style="{left: `${position.width/2 - 5}px`, top:`${position.height/2 - 10}px`}"
         v-show="type==='note'">
      <svg width="8" height="8">
        <rect x="0" y="0" width="8" height="8" fill="white" stroke="black" stroke-width="2" style="cursor: ew-resize;"
              @mousedown="interact('NODERESIZE', $event)"></rect>
      </svg>
    </div>

    <!--LEFT ICONS-->
    <div class="icon-position v-center-align hand" :style="{right: `${posPad.width/2}px`}" v-show="type==='note'">
      <div class="icon-wrapper">
        <svg style="width: 22px; height: 22px;" viewBox="0 0 539 512" class="custom-icon"
             @mousedown="interact('GROUPDRAG', $event)">
          <!--
            Icon By FontAwesome - modified by Yusuf Ades
            available: https://fontawesome.com/icons/sign-in-alt?style=solid
            license: CC BY 4.0 - https://fontawesome.com/license/free
          -->
          <path fill="#575959" d="M443,448h-84c-6.6,0-12-5.4-12-12v-40c0-6.6,5.4-12,12-12h84c17.7,0,32-14.3,32-32V160c0-17.7-14.3-32-32-32h-84
      c-6.6,0-12-5.4-12-12V76c0-6.6,5.4-12,12-12h84c53,0,96,43,96,96v192C539,405,496,448,443,448z M454.5,250.3l-133.6-135
      c-11.9-12.1-32.6-3.6-32.6,13.7v77.1H180.1c-10.6,0-19.1,8.6-19.1,19.3v77.1c0,10.7,8.5,19.3,19.1,19.3h108.1V399
      c0,17.3,20.7,25.7,32.6,13.7l133.6-135C461.8,270.1,461.8,257.9,454.5,250.3z"></path>
          <path fill="#575959" d="M8.5,250l133.6-133.6c12-11.9,32.6-3.5,32.6,13.5v76.3h108.2c10.6,0,19.1,8.5,19.1,19.1v76.3c0,10.6-8.5,19.1-19.1,19.1
      H174.8v76.3c0,17.1-20.7,25.4-32.6,13.5L8.5,277C1.2,269.6,1.2,257.5,8.5,250z"></path>
        </svg>
      </div>
      <div class="icon-wrapper">
        <fa-icon icon="shapes" class="custom-icon" @mouseenter="timerStart" @mouseleave="timerCancel"></fa-icon>
      </div>
    </div>

    <!--Change shape menu-->
    <!--TODO curve shapes around button, add no border shape.-->
    <div class="icon-position v-center-align" :style="{right: `${posPad.width/2 + 28}px`}" v-show="shapesToggle">
      <svg width="26" height="23">
        <rect x="1" y="1" width="24" height="21" class="shape-icon"
              @mousedown="interact('SHAPE', $event,'rect')"></rect>
      </svg>
      <svg width="26" height="23">
        <rect rx="6" ry="6" x="1" y="1" width="24" height="21" class="shape-icon"
              @mousedown="interact('SHAPE', $event,'capsule')"></rect>
      </svg>
      <svg width="26" height="26">
        <circle cx="13" cy="13" r="12" class="shape-icon"
                @mousedown="interact('SHAPE', $event,'circle')"></circle>
      </svg>
    </div>

  </div>
</template>

<script>
  import { library } from '@fortawesome/fontawesome-svg-core';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { faThumbtack, faArrowRight, faPaintBrush, faShapes } from '@fortawesome/free-solid-svg-icons';
  import { faTrashAlt } from '@fortawesome/free-regular-svg-icons';

  library.add(faTrashAlt, faThumbtack, faArrowRight, faPaintBrush, faShapes);
  export default {
    name: 'hoverMenuNode',
    components: { faIcon: FontAwesomeIcon },
    props: {
      pad: {
        type: Number,
        default() {
          return 0;
        },
      },
      display: {
        type: Boolean,
        default() {
          return false;
        },
      },
      position: {
        type: Object,
        default() {
          return { x: 0, y: 0, width: 0, height: 0 };
        },
      },
      color: {
        type: String,
        default() {
          return '#575959';
        },
      },
      fixed: {
        type: Boolean,
        default() {
          return false;
        },
      },
      showTextBar: {
        type: Boolean,
        default() {
          return undefined;
        },
      },
      data: {},
      shape: {},
      type: {
        type: String,
        default() {
          return 'note';
        },
      },
    },
    data() {
      return {
        shapesToggle: false,
        timerId: false,
      };
    },
    computed: {
      posPad() {
        const posPad = { ...this.position };
        posPad.width += this.pad;
        posPad.height += this.pad;
        posPad.x -= this.pad / 2;
        posPad.y -= this.pad / 2;
        return posPad;
      },
      pinned() {
        return this.fixed ? 'pinned' : 'unpinned';
      },
      mouseLimit() {
        const yMargin = 80;
        if (this.shapesToggle) {
          const xMargin = 115;
          return {
            x: this.position.x - (xMargin * 0.58),
            y: this.position.y - (yMargin * 0.58),
            X: this.position.x + this.position.width + (xMargin / 2),
            Y: this.position.y + this.position.height + (yMargin / 2),
          };
        }
        const xMargin = 85;
        return {
          x: this.position.x - (xMargin / 2),
          y: this.position.y - (yMargin / 2),
          X: this.position.x + this.position.width + (xMargin / 2),
          Y: this.position.y + this.position.height + (yMargin / 2),
        };
      },
      // hoverBackPos: function () {
      //   if (this.shapesToggle) {
      //     return {
      //       width: `${this.pos.width + 115}px`,
      //       height: `${this.pos.height + 80}px`,
      //       transform: 'translate(-58%, -50%)'
      //     };
      //   } else {
      //     return {
      //       width: `${this.pos.width + 85}px`,
      //       height: `${this.pos.height + 80}px`,
      //       transform: 'translate(-50%, -50%)'
      //     };
      //   }
      // },
      // hoverRectPos: function () {
      //   if (this.shapesToggle) {
      //     return {
      //       width: `${this.pos.width + 95}px`,
      //       height: `${this.pos.height + 60}px`,
      //       y: 10,
      //       x: 10,
      //     };
      //   } else {
      //     return {
      //       width: `${this.pos.width + 65}px`,
      //       height: `${this.pos.height + 60}px`,
      //       y: 10,
      //       x: 10,
      //     };
      //   }
      // }
    },
    beforeDestroy() {
      document.removeEventListener('mousemove', this.mouseOutCheck);
      this.timerCancel();
    },
    watch: {
      display(displayed) {
        if (displayed) {
          document.addEventListener('mousemove', this.mouseOutCheck);
        } else {
          this.shapesToggle = false;
          this.timerId = false;
          document.removeEventListener('mousemove', this.mouseOutCheck);
        }
      },
    },
    methods: {
      mouseOutCheck(event) {
        if (event.clientX < this.mouseLimit.x
          || event.clientX > this.mouseLimit.X
          || event.clientY < this.mouseLimit.y
          || event.clientY > this.mouseLimit.Y) {
          this.exit(event);
        }
      },
      exit(payload) {
        this.shapesToggle = false;
        this.timerId = false;
        this.$emit('exitHover', payload);
      },
      interact(message, event, payload) {
        this.$emit('clickedButton', { type: message, data: this.data, e: event, payload });
        if (message === 'DELETE' || message === 'SHAPE') {
          this.exit(event);
        }
      },
      timerStart() {
        if (!this.timerId && !this.shapesToggle) {
          this.timerId = window.setTimeout(() => {
            this.shapesToggle = true;
            this.timerId = false;
          }, 100);
        }
      },
      timerCancel() {
        if (this.timerId) {
          clearTimeout(this.timerId);
          this.timerId = false;
        }
      },
    },
  };
</script>

<style scoped>
  * {
    box-sizing: border-box;
  }

  .shape-icon {
    stroke: #9b9b9b;
    stroke-width: 2px;
    fill: #edfdfd;
  }

  #hover-back {
    pointer-events: none;
    position: absolute;
  }

  #hover-rect {
    fill-opacity: 0;
    stroke-opacity: 0;
    stroke-width: 10px;
    pointer-events: stroke;
  }

  .h-center-align {
    transform: translateX(-50%);
  }

  .v-center-align {
    transform: translateY(-50%);
  }

  #graph-hover-menu {
    position: fixed;
  }

  .icon-position {
    position: absolute;
  }

  .hand {
    cursor: pointer;
  }

  .bgpicker {
    font-size: 19px !important;
    filter: drop-shadow(1px 0 6px rgb(19, 26, 39));
  }

  .icon-wrapper {
    overflow: visible;
    margin-top: 1px !important;
    width: 22px;
  }

  .icon-wrapper .pinned, .icon-wrapper .unpinned {
    border-radius: 100%;
    border: 1px solid #fff;
    box-shadow: 0 1px 10px rgba(0, 0, 0, 0.46);
    display: table-cell;
    font-size: 20px;
    padding: 2px;
    text-align: center;
    transition: 1s;
    vertical-align: middle;
    width: 22px;
  }

  .icon-wrapper .pinned {
    background: #B6EFEF;
    color: #575959;
  }

  .icon-wrapper .unpinned {
    background: #E9FAFA;
    color: #9b9da0;
    -webkit-text-stroke: 1px #9b9da0;
    -webkit-text-fill-color: rgba(182, 239, 239, 0.3);
  }

  .icon-wrapper .custom-icon {
    overflow: visible;
    background: #E9FAFA;
    border-radius: 100%;
    border: 1px solid #fff;
    box-shadow: 0 1px 10px rgba(0, 0, 0, 0.46);
    color: #575959;
    display: table-cell;
    font-size: 20px;
    padding: 2px;
    text-align: center;
    transition: 1s;
    vertical-align: middle;
    width: 22px;
  }

  .custom-icon:hover {
    background: #B6EFEF;
  }

  .rectangle {
    background: #E9FAFA;
    box-shadow: 0 1px 10px rgba(0, 0, 0, 0.46);
    -webkit-border-radius: 5px;
    -moz-border-radius: 5px;
    border-radius: 5px;
    height: 5px;
  }

  .circle {
    height: 3px;
    width: 4px;
    background-color: #555;
    border-radius: 50%;
    float: left;
    margin-left: 5px;
    margin-top: 1px;
  }

  .circle-wrapper {
    position: relative;
    left: calc(50% - 15px);
  }

</style>
