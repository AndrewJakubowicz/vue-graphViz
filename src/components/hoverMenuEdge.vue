<template>
  <div id="edge-hover-menu" ref="parent"
       :style="{top:`${posPad.y+posPad.height/2 - 20}px`, left:`${posPad.x+posPad.width/2 - 20}px`}"
       v-show="display">

    <!--TOP ICONS-->
    <!-- arrows -->
    <div class="icon-wrapper icon-position h-center-align hand" :style="{bottom:`${posPad.height/2 - 15}px`}"
         v-show="type==='edge' && !arrowsToggle">
      <fa-icon icon="arrows-alt" class="custom-icon" @mouseenter="arrowsTimerStart"
               @mouseleave="arrowsTimerCancel"></fa-icon>
    </div>

    <!-- Change arrow menu -->
    <!-- 0 - None, 1 - Right, -1 - Left, 2 - Bidirectional -->
    <div class="icon-wrapper icon-position h-center-align hand"
         :style="{bottom:`${posPad.height/2 - 10}px`, left: `${posPad.width/2 - 64}px`}" v-show="arrowsToggle">
      <fa-icon icon="arrows-alt-h" class="custom-icon" @click="interact('ARROW', $event, 2)"></fa-icon>
    </div>
    <div class="icon-wrapper icon-position h-center-align hand"
         :style="{bottom:`${posPad.height/2 - 10}px`, left: `${posPad.width/2 - 40}px`}" v-show="arrowsToggle">
      <fa-icon icon="long-arrow-alt-left" class="custom-icon" @click="interact('ARROW', $event, -1)"></fa-icon>
    </div>
    <div class="icon-wrapper icon-position h-center-align hand"
         :style="{bottom:`${posPad.height/2 - 10}px`, left: `${posPad.width/2 - 16}px`}" v-show="arrowsToggle">
      <fa-icon icon="long-arrow-alt-right" class="custom-icon" @click="interact('ARROW', $event, 1)"></fa-icon>
    </div>
    <div class="icon-wrapper icon-position h-center-align hand"
         :style="{bottom:`${posPad.height/2 - 10}px`, left: `${posPad.width/2 + 8}px`}" v-show="arrowsToggle">
      <fa-icon icon="minus" class="custom-icon" @click="interact('ARROW', $event, 0)"></fa-icon>
    </div>

    <!--BOTTOM ICONS-->
    <!-- paint brush -->
    <div class="icon-position h-center-align menu-color hand"
         :style="{top:`${posPad.height/2 - 10}px`, left: `${posPad.width/2 - 48}px`}">
      <fa-icon icon="paint-brush" class="bgpicker" :style="{color}" @click="interact('COLOR', $event)"></fa-icon>
    </div>

    <!-- trash -->
    <div class="icon-wrapper icon-position h-center-align hand"
         :style="{top:`${posPad.height/2 - 12}px`, left: `${posPad.width/2 - 16}px`}">
      <fa-icon :icon="['far','trash-alt']" class="custom-icon" @click="interact('DELETE', $event)"></fa-icon>
    </div>

    <!--RIGHT ICONS-->
    <!-- weights -->
    <div class="icon-position v-center-align hand"
         :style="{top:`${posPad.height/2 - 30}px`, left:`${posPad.width/2 - 10}px`}"
         v-show="type==='edge' && !weightsToggle">
      <div class="icon-wrapper">
        <svg class="custom-icon" style="padding: 3px; width: 22px; height: 22px;"
             @mouseenter="weightsTimerStart" @mouseleave="weightsTimerCancel">
          <line class="weight-icon" x1="0" y1="2.5" x2="15" y2="2.5" stroke-width="2"></line>
          <line class="weight-icon" x1="0" y1="6" x2="15" y2="6" stroke-width="3"></line>
          <line class="weight-icon" x1="0" y1="10.5" x2="15" y2="10.5" stroke-width="4"></line>
        </svg>
      </div>
    </div>

    <!--Change weight menu-->
    <div class="icon-position v-center-align" :style="{top:`${posPad.height/2 - 55}px`, left:`${posPad.width/2}px`}"
         v-show="weightsToggle">
      <div class="icon-wrapper">
        <svg class="custom-icon" style="padding: 3px; width: 22px; height: 22px;"
             @mousedown="interact('WEIGHT', $event, 2)">
          <line class="weight-icon" x1="0" y1="7" x2="14" y2="7" stroke-width="2"></line>
        </svg>
      </div>
    </div>
    <div class="icon-position v-center-align" :style="{top:`${posPad.height/2 - 30}px`, left:`${posPad.width/2}px`}"
         v-show="weightsToggle">
      <div class="icon-wrapper">
        <svg class="custom-icon" style="padding: 3px; width: 22px; height: 22px;"
             @mousedown="interact('WEIGHT', $event, 4)">
          <line class="weight-icon" x1="0" y1="7" x2="14" y2="7" stroke-width="4"></line>
        </svg>
      </div>
    </div>
    <div class="icon-position v-center-align" :style="{top:`${posPad.height/2 - 5}px`, left:`${posPad.width/2}px`}"
         v-show="weightsToggle">
      <div class="icon-wrapper">
        <svg class="custom-icon" style="padding: 3px; width: 22px; height: 22px;"
             @mousedown="interact('WEIGHT', $event, 6)">
          <line class="weight-icon" x1="0" y1="7" x2="14" y2="7" stroke-width="6"></line>
        </svg>
      </div>
    </div>

    <!--LEFT ICONS-->
    <!-- dashes -->
    <div class="icon-position v-center-align hand"
         :style="{top:`${posPad.height/2 - 30}px`, right: `${posPad.width / 2 - 10}px`}"
         v-show="type==='edge' && !dashesToggle">
      <div class="icon-wrapper">
        <svg class="custom-icon" style="padding: 3px; width: 22px; height: 22px;"
             @mouseenter="dashesTimerStart" @mouseleave="dashesTimerCancel">
          <line class="dash-icon" x1="-0.5" y1="4.5" x2="14.5" y2="4.5" stroke-dasharray="0"></line>
          <line class="dash-icon" x1="-0.5" y1="10.5" x2="14.5" y2="10.5" stroke-dasharray="3"></line>
        </svg>
      </div>
    </div>

    <!--Change dash menu-->
    <div class="icon-position v-center-align" :style="{top:`${posPad.height/2 - 42}px`, right: `${posPad.width/2}px`}"
         v-show="dashesToggle">
      <div class="icon-wrapper">
        <svg class="custom-icon" style="padding: 3px; width: 22px; height: 22px;"
             @mousedown="interact('DASH', $event, 0)">
          <line class="dash-icon" x1="-1" y1="7" x2="14" y2="7" stroke-dasharray="0"></line>
        </svg>
      </div>
    </div>
    <div class="icon-position v-center-align" :style="{top:`${posPad.height/2 - 17}px`, right: `${posPad.width/2}px`}"
         v-show="dashesToggle">
      <div class="icon-wrapper">
        <svg class="custom-icon" style="padding: 3px; width: 22px; height: 22px;"
             @mousedown="interact('DASH', $event, 3)">
          <line class="dash-icon" x1="-1" y1="7" x2="14" y2="7" stroke-dasharray="3"></line>
        </svg>
      </div>
    </div>

  </div>
</template>

<script>
  import { library } from '@fortawesome/fontawesome-svg-core';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import {
    faPaintBrush,
    faArrowsAlt,
    faArrowsAltH,
    faMinus,
    faLongArrowAltLeft,
    faLongArrowAltRight,
  } from '@fortawesome/free-solid-svg-icons';
  import { faTrashAlt } from '@fortawesome/free-regular-svg-icons';

  library.add(faTrashAlt, faMinus, faLongArrowAltLeft, faLongArrowAltRight,
    faPaintBrush, faArrowsAlt, faArrowsAltH);

  export default {
    name: 'hoverMenuEdge',
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
      data: {},
      type: {
        type: String,
        default() {
          return 'note';
        },
      },
    },
    data() {
      return {
        arrowsTimerId: false,
        weightsTimerId: false,
        dashesTimerId: false,
        arrowsToggle: false,
        weightsToggle: false,
        dashesToggle: false,
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
      mouseLimit() {
        const yMargin = 80;
        if (this.dashesToggle || this.weightsToggle || this.arrowsToggle) {
          const xMargin = 115;
          return {
            x: this.position.x - (xMargin * 0.58),
            y: this.position.y - (yMargin * 0.58),
            X: this.position.x + this.position.width + (xMargin / 2),
            Y: this.position.y + this.position.height + (yMargin / 2),
          };
        }
        const xMargin = 115;
        return {
          x: this.position.x - (xMargin / 2),
          y: this.position.y - (yMargin / 2),
          X: this.position.x + this.position.width + (xMargin / 2),
          Y: this.position.y + this.position.height + (yMargin / 2),
        };
      },
    },
    beforeDestroy() {
      document.removeEventListener('mousemove', this.mouseOutCheck);
      this.weightsTimerCancel();
      this.dashesTimerCancel();
      this.arrowsTimerCancel();
    },
    watch: {
      display(displayed) {
        if (displayed) {
          document.addEventListener('mousemove', this.mouseOutCheck);
        } else {
          this.arrowsTimerId = false;
          this.weightsTimerId = false;
          this.dashesTimerId = false;
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
        this.arrowsToggle = false;
        this.arrowsTimerId = false;
        this.weightsToggle = false;
        this.weightsTimerId = false;
        this.dashesToggle = false;
        this.dashesTimerId = false;
        this.$emit('exitHover', payload);
      },
      interact(message, event, payload) {
        this.$emit('clickedButton', { type: message, data: this.data, e: event, payload });
        if (message === 'WEIGHT' || message === 'DASH' || message === 'DELETE' || message === 'ARROW') {
          this.exit(event);
        }
      },
      arrowsTimerStart() {
        if (!this.arrowsTimerId && !this.arrowsToggle) {
          this.arrowsTimerId = window.setTimeout(() => {
            this.arrowsToggle = true;
            this.arrowsTimerId = false;
            this.weightsToggle = false;
            this.dashesToggle = false;
          }, 100);
        }
      },
      arrowsTimerCancel() {
        if (this.arrowsTimerId) {
          clearTimeout(this.arrowsTimerId);
          this.arrowsTimerId = false;
        }
      },
      weightsTimerStart() {
        if (!this.weightsTimerId && !this.weightsToggle) {
          this.weightsTimerId = window.setTimeout(() => {
            this.weightsToggle = true;
            this.weightsTimerId = false;
            this.arrowsToggle = false;
            this.dashesToggle = false;
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
            this.arrowsToggle = false;
            this.weightsToggle = false;
          }, 100);
        }
      },
      dashesTimerCancel() {
        if (this.dashesTimerId) {
          clearTimeout(this.dashesTimerId);
          this.dashesTimerId = false;
        }
      },
    },
  };
</script>

<style scoped>
  * {
    box-sizing: border-box;
  }

  .weight-icon {
    stroke: #575959;
  }

  .dash-icon {
    stroke: #575959;
    stroke-width: 3.5;
  }

  .h-center-align {
    transform: translateX(-50%);
  }

  .v-center-align {
    transform: translateY(-50%);
  }

  #edge-hover-menu {
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

</style>
