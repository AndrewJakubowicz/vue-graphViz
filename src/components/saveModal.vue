<!--https://vuejs.org/v2/examples/modal.html-->
<template>
  <transition name="modal">
    <div id="graph-save-menu" class="modal-mask" v-show="display">
      <div class="modal-wrapper">
        <div class="modal-container">

          <h3>Save Graph</h3>

          <div>
            <img ref="png" style="max-width: 100%" src="" alt="preview">
          </div>

          <div class="filename-wrapper">
            <p style="margin: 0">Filename:</p>
            <input v-model.trim="filename" placeholder="filename">
          </div>

          <div class="button-wrapper">
            <button class="save-button" @click="saveSVG">Save SVG</button>
            <button ref="savePNG" class="save-button" :disabled="true">Export Image</button>
            <button class="exit-button" @click="exit">Cancel</button>
          </div>

        </div>
      </div>
    </div>
  </transition>
</template>

<script>
  import saveAs from 'file-saver';

  export default {
    name: 'saveModal',
    props: {
      display: {
        type: Boolean,
        default() {
          return false;
        },
      },
      svgData: {},
      graphData: {},
    },
    data() {
      return {
        filename: 'graphviz',
      };
    },
    watch: {
      display(displayed) {
        // on display create PNG preview
        if (displayed) {
          const svg = this.svgData.cloneNode(true);
          // set final image to match svg size
          const svgSize = this.svgData.getBBox();
          svg.setAttribute('viewBox', `${svgSize.x - 3} ${svgSize.y - 3} ${svgSize.width + 3} ${svgSize.height + 3}`);

          const svgString = new XMLSerializer().serializeToString(svg);
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          canvas.width = svgSize.width;
          canvas.height = svgSize.height;

          // Convert SVG string to data URL
          const imgsrc = `data:image/svg+xml;base64,${btoa(svgString)}`;

          const img = new Image();
          // on image load, enable save as PNG button, and set correct onclick function
          img.onload = () => {
            ctx.drawImage(img, 0, 0);
            // display preview image
            this.$refs.png.src = canvas.toDataURL('image/png');
            // enable save as button
            this.$refs.savePNG.disabled = false;
            // set onclick callback
            this.$refs.savePNG.onclick = () => {
              canvas.toBlob((blob) => {
                saveAs(blob, `${this.filename}.png`);
                this.exit();
              });
            };
          };
          img.src = imgsrc;
        }
      },
    },
    methods: {
      saveSVG() {
        // add JSON structure to svg
        const svg = this.svgData.cloneNode(true);
        const svgSize = this.svgData.getBBox();
        svg.setAttribute('viewBox', `${svgSize.x - 3} ${svgSize.y - 3} ${svgSize.width + 3} ${svgSize.height + 3}`);
        const desc = document.createElementNS('http://www.w3.org/2000/svg', 'desc');
        desc.setAttribute('id', 'graphJSONData');
        svg.appendChild(desc);
        // save as file
        let svgString = new XMLSerializer().serializeToString(svg);
        // insert JSON data after serialisation using regex.
        // Inserting before may cause HTML inside JSON  to be parsed by XMLSerializer.
        const re = new RegExp('<desc id="graphJSONData"\/>');
        if (re.test(svgString)) {
          const dataString = `<desc id="graphJSONData">${this.graphData}</desc>`;
          svgString = svgString.replace(re, dataString);
        } else {
          console.warn('Error occured whilst saving. Could not find desc.');
        }
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        saveAs(svgBlob, `${this.filename}.svg`);
        this.exit();
      },
      exit() {
        this.$refs.savePNG.disabled = true;
        this.$refs.savePNG.onclick = undefined;
        this.$emit('close');
      },
    },
  };
</script>

<style scoped>
  * {
    box-sizing: border-box;
  }

  .modal-mask {
    position: fixed;
    z-index: 9998;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, .4);
    display: table;
    transition: opacity 0.3s ease;
  }

  .modal-wrapper {
    display: table-cell;
    vertical-align: middle;
  }

  .modal-container {
    width: 400px;
    margin: 0px auto;
    padding: 20px 30px;
    background-color: #fff;
    border-radius: 2px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, .33);
    transition: all .3s ease;
    font-family: Helvetica, Arial, sans-serif;
  }

  h3 {
    margin-top: 0;
    color: #575959;
  }

  button {
    border: 0;
    box-shadow: none;
    border-radius: 5px;
    font-size: 16px;
    font-family: "Helvetica Neue", "Source Sans Pro", Helvetica, Arial, sans-serif;
    color: white;
    font-weight: 500;
    padding: 10px;
  }

  .save-button {
    background-color: #20a0ff;
    margin: 5px 17px 5px 0;
  }

  .save-button:disabled {
    background-color: grey;
  }

  .exit-button {
    background-color: #ff6454;
    float: right;
    margin: 5px 0;
  }

  .filename-wrapper {
    display: flex;
    margin: 0;
    padding: 20px 5px 7px 0;
  }

  p {
    margin: 0;
    padding: 5px 10px 5px 0;
    color: #575959;
  }

  img {
    box-shadow: 1px 1px 1px 1px #ccc;
  }

  input {
    border: 1px solid #ccc;
    border-radius: 5px;
    padding-left: 10px;
    color: #575959;
  }

  .modal-enter {
    opacity: 0;
  }

  .modal-leave-active {
    opacity: 0;
  }

  .modal-enter .modal-container,
  .modal-leave-active .modal-container {
    -webkit-transform: scale(1.1);
    transform: scale(1.1);
  }
</style>
