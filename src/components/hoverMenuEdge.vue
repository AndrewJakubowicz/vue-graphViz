<template>
  <div id="edge-hover-menu" ref="parent"
       :style="{top:`${posPad.y+posPad.height/2}px`, left:`${posPad.x+posPad.width/2}px`}"
       v-show="display">

    <!--SVG to detect mouse leave-->
    <!--Usefull to debug mouse limit size-->
    <!--<svg id="hover-back" :style="hoverBackPos">-->
    <!--<rect id="hover-rect" rx="50" ry="40" width="0" height="0"-->
    <!--:style="hoverRectPos"></rect>-->
    <!--</svg>-->

    <!--TOP ICONS-->
    <!-- paint brush -->
    <div class="icon-position h-center-align menu-color hand" :style="{bottom:`${posPad.height/2}px`}">
      <i class="fa fa-paint-brush" id="bgpicker" :style="{color}" @click="interact('COLOR', $event)"></i>
    </div>

    <!--BOTTOM ICONS-->
    <!-- trash -->
    <div class="icon-wrapper icon-position h-center-align hand" :style="{top:`${posPad.height/2}px`}">
      <i class="fa fa-trash-o custom-icon" @click="interact('DELETE', $event)"></i>
    </div>

    <!--RIGHT ICONS-->
    <!-- weights -->
    <div class="icon-position v-center-align hand" :style="{left: `${posPad.width / 2}px`}" v-show="type==='note'">
      <div class="icon-wrapper">
        <svg class="custom-icon" style="padding: 3px; width: 22px; height: 22px;"
             @mouseenter="weightsTimerStart" @mouseleave="weightsTimerCancel">
          <line class="weight-icon" x1="1" y1="1" x2="21" y2="1" stroke-width="3.5"></line>
          <line class="weight-icon" x1="1" y1="6.5" x2="21" y2="6.5" stroke-width="5"></line>
          <line class="weight-icon" x1="1" y1="14" x2="21" y2="14" stroke-width="6.5"></line>
        </svg>
      </div>
    </div>

    <!--Change weight menu-->
    <div class="icon-position v-center-align" :style="{right: `${posPad.width/2+24+4}px`}" v-show="weightsToggle">
      <svg width="26" height="23">
        <line class="weight-icon" x1="1" y1="12" x2="25" y2="12" stroke-width="5" 
              @mousedown="interact('WEIGHT', $event, 2)"></line>
      </svg>
      <svg width="26" height="23">
        <line class="weight-icon" x1="1" y1="12" x2="25" y2="12" stroke-width="10"
              @mousedown="interact('WEIGHT', $event, 4)"></line>
      </svg>
      <svg width="26" height="23">
        <line class="weight-icon" x1="1" y1="12" x2="25" y2="12" stroke-width="15"
              @mousedown="interact('WEIGHT', $event, 6)"></line>
      </svg>
    </div>

    <!--LEFT ICONS-->
    <!-- dashes -->
    <div class="icon-position v-center-align hand" :style="{right: `${posPad.width / 2}px`}" v-show="type==='note'">
      <div class="icon-wrapper">
        <svg class="custom-icon" style="padding: 3px; width: 22px; height: 22px;"
             @mouseenter="dashesTimerStart" @mouseleave="dashesTimerCancel">
          <line class="dash-icon" x1="1" y1="5" x2="21" y2="7.5" stroke-dasharray=""></line>
          <line class="dash-icon" x1="1" y1="14.5" x2="21" y2="14.5" stroke-dasharray="1"></line>
        </svg>
      </div>
    </div>

    <!--Change dash menu-->
    <div class="icon-position v-center-align" :style="{right: `${posPad.width/2+24+4}px`}" v-show="dashesToggle">
      <svg width="26" height="23">
        <line class="dash-icon" x1="1" y1="12" x2="25" y2="12" stroke-dasharray=""
              @mousedown="interact('DASH', $event, 0)"></line>
      </svg>
      <svg width="26" height="23">
        <line class="dash-icon" x1="1" y1="12" x2="25" y2="12" stroke-dasharray="1"
              @mousedown="interact('DASH', $event, 1)"></line>
      </svg>
    </div>

  </div>
</template>

<script>
  export default {
    name: 'hoverMenuEdge',
    props: {
      pad: {
        type: Number,
        default: function () {
          return 0;
        }
      },
      display: {
        type: Boolean,
        default: function () {
          return false;
        }
      },
      position: {
        type: Object,
        default: function () {
          return { x: 0, y: 0, width: 0, height: 0 };
        }
      },
      color: {
        type: String,
        default: function () {
          return '#575959';
        },
      },
      // fixed: {
      //   type: Boolean,
      //   default: function () {
      //     return false;
      //   },
      // },
      data: {},
      // shape: {},
      type: {
        type: String,
        default: function () {
          return 'note';
        },
      },
    },
    data() {
      return {
        // shapesToggle: false,
        weightsTimerId: false,
        dashesTimerId: false,
        weightsToggle: false,
        dashesToggle: false
      };
    },
    computed: {
      posPad: function () {
        const posPad = { ...this.position };
        posPad.width += this.pad;
        posPad.height += this.pad;
        posPad.x -= this.pad / 2;
        posPad.y -= this.pad / 2;
        return posPad;
      },
      // pinned: function () {
      //   return this.fixed ? 'pinned' : 'unpinned';
      // },
      mouseLimit: function () {
        const yMargin = 80;
        if (this.shapesToggle) {
          const xMargin = 115;
          return {
            x: this.position.x - xMargin * 0.58,
            y: this.position.y - yMargin * 0.58,
            X: this.position.x + this.position.width + xMargin / 2,
            Y: this.position.y + this.position.height + yMargin / 2,
          };
        } else {
          const xMargin = 85;
          return {
            x: this.position.x - xMargin / 2,
            y: this.position.y - yMargin / 2,
            X: this.position.x + this.position.width + xMargin / 2,
            Y: this.position.y + this.position.height + yMargin / 2,
          };
        }
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
      this.weightsTimerCancel();
      this.dashesTimerCancel();
    },
    watch: {
      display(displayed) {
        if (displayed) {
          document.addEventListener('mousemove', this.mouseOutCheck);
        } else {
          this.shapesToggle = false;
          this.weightsTimerId = false;
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
      weightExit(payload) {
        this.weightsToggle = false;
        this.weightsTimerId = false;
        this.exit(payload);
      },
      dashExit(payload) {
        this.dashesToggle = false;
        this.dashesTimerId = false;
        this.exit(payload);
      },
      exit(payload) {
        this.$emit('exitHover', payload)
      },
      interact(message, event, payload) {
        this.$emit('clickedButton', { type: message, data: this.data, e: event, payload: payload });
        if (message === 'WEIGHT') {
          this.weightExit(event);
        }
        else if (message === 'DASH') {
          this.dashExit(event);
        }
        else if (message === 'DELETE') {
          this.exit(event)
        }
      },
      weightsTimerStart() {
        if (!this.weightsTimerId && !this.weightsToggle) {
          this.weightsTimerId = window.setTimeout(() => {
            this.weightsToggle = true;
            this.weightsTimerId = false;
          }, 100);
        }
      },
      weightsTimerCancel() {
        if (this.weightsTimerId) {
          clearTimeout(this.weightsTimerId);
          this.weightsTimerId = false;
        }
      },
      dashesTimerStart() {
        if (!this.dashesTimerId && !this.dashesToggle) {
          this.dashesTimerId = window.setTimeout(() => {
            this.dashesToggle = true;
            this.dashesTimerId = false;
          }, 100);
        }
      },
      dashesTimerCancel() {
        if (this.dashesTimerId) {
          clearTimeout(this.dashesTimerId);
          this.dashesTimerId = false;
        }
      }
    }
  };
</script>

<style scoped>
  * {
    box-sizing: border-box;
  }

  /* .shape-icon {
    stroke: #9b9b9b;
    stroke-width: 2px;
    fill: #edfdfd;
  } */

  .weight-icon {
    stroke: #000000;
  }

  .dash-icon {
    stroke: #000000;
    stroke-width: 3.5;
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

  .menu-color .fa-paint-brush {
    font-size: 19px !important;
    text-shadow: rgb(31, 45, 61) 1px 0 6px;
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
    font-size: 15px;
    height: 15px;
    padding: 2px;
    text-align: center;
    transition: 1s;
    vertical-align: middle;
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
    font-size: 15px;
    height: 15px;
    padding: 2px;
    text-align: center;
    transition: 1s;
    vertical-align: middle;
  }

  .custom-icon:hover {
    background: #B6EFEF;
  }

</style>
