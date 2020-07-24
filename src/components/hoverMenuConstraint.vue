<template>
  <div id="constraint-hover-menu" ref="parent"
       :style="{top:`${posPad.y+posPad.height/2 - 20}px`, left:`${posPad.x+posPad.width/2 - 20}px`}"
       v-show="display">

    <div v-if="display && data.data.axis==='y' " class="icon-wrapper icon-position h-center-align hand"
         :style="{top: `${posPad.height/2}px`}">
      <fa-icon :icon="['far','trash-alt']" class="custom-icon" @click="interact('DELETE', $event)"></fa-icon>
    </div>

    <div v-if="display && data.data.axis==='x' " class="icon-wrapper icon-position v-center-align hand"
         :style="{left: `${posPad.width/2}px`}">
      <fa-icon :icon="['far','trash-alt']" class="custom-icon" @click="interact('DELETE', $event)"></fa-icon>
    </div>

  </div>
</template>

<script>
  import { library } from '@fortawesome/fontawesome-svg-core';
  import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
  import { faTrashAlt } from '@fortawesome/free-regular-svg-icons';

  library.add(faTrashAlt);

  export default {
    name: 'hoverMenuConstraint',
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
      data: {},
    },
    data() {
      return {};
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
    },
    watch: {
      display(displayed) {
        if (displayed) {
          document.addEventListener('mousemove', this.mouseOutCheck);
        } else {
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
        this.$emit('exitHover', payload);
      },
      interact(message, event) {
        this.$emit('clickedButton', { type: message, data: this.data, e: event });
        this.exit(event);
      },


    },
  };
</script>

<style scoped>
  * {
    box-sizing: border-box;
  }

  .h-center-align {
    transform: translateX(-50%);
  }

  .v-center-align {
    transform: translateY(-50%);
  }

  #constraint-hover-menu {
    position: fixed;
  }

  .icon-position {
    position: absolute;
  }

  .hand {
    cursor: pointer;
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
