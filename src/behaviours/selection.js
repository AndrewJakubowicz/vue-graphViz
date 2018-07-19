'use strict';

export default class Selection {
  /**
   * Creates a selection object.
   * @param select - a selection, array of nodes/edges or node/edge
   */
  constructor(select) {
    this.nodes = new Map();
    this.edges = new Map();
    select && this.select(select);
  }

  /***
   * Add nodes/edges to selection
   * @param select - a selection, array of nodes/edges or node/edge
   */
  select(select) {
    if (select instanceof Selection) {
      this.merge(select);
    }
    else {
      select = Array.isArray(select) ? select : [select];
      select.forEach((d) => {
        switch (d.hash.substring(0, 4)) {
          case 'edge': {
            this.edges.set(d.hash, d);
            break;
          }
          case 'note': {
            this.nodes.set(d.hash, d);
            if (!d.class.includes('highlight')) {
              d.class += ' highlight';
            }
            break;
          }
          default: {
            console.warn('Unkown element in selection.');
          }
        }
      });
    }
  }

  /**
   * Remove nodes/edges from selection
   * @param select - a selection, array of nodes/edges or node/edge
   */
  deselect(select) {
    if (select instanceof Selection) {
      this.minus(select);
    }
    else {
      select = Array.isArray(select) ? select : [select];
      select.forEach((d) => {
        switch (d.hash.substring(0, 4)) {
          case 'edge': {
            this.edges.delete(d.hash);
            break;
          }
          case 'note': {
            this.nodes.delete(d.hash);
            d.class = d.class.replace(' highlight', '');
            break;
          }
          default: {
            console.warn('Unkown element in selection.');
          }
        }
      });
    }
  }

  /***
   * Add new to selection, remove existing
   * @param select - a selection, array of nodes/edges or node/edge
   */
  selectExclusive(select) {
    if (select instanceof Selection) {
      this.xor(select);
    }
    else {
      select = Array.isArray(select) ? select : [select];
      select.forEach((d) => {
        switch (d.hash.substring(0, 4)) {
          case 'edge': {
            this.edges.has(d.hash) ? this.edges.delete(d.hash) : this.edges.set(d.hash, d);
            break;
          }
          case 'note': {
            if (this.nodes.has(d.hash)) {
              this.nodes.delete(d.hash);
              d.class = d.class.replace(' highlight', '');
            }
            else {
              this.nodes.set(d.hash, d);
              if (!d.class.includes('highlight')) {
                d.class += ' highlight';
              }
            }
            break;
          }
          default: {
            console.warn('Unkown element in selection.');
          }
        }
      });
    }
  }

  /**
   * reset selection
   */
  clear() {
    this.clearEdges();
    this.clearNodes();
  }

  /**
   * clear nodes in selection
   */
  clearNodes() {
    this.deselect([...this.nodes.values()]);
  }

  /**
   * clear edges in selection
   */
  clearEdges() {
    this.edges.clear();
  }

  merge(select) {
    select.nodes.forEach((v, k) => {
      this.nodes.set(k, v);
      if (!v.class.includes('highlight')) {
        v.class += ' highlight';
      }
    });
    select.edges.forEach((v, k) => {
      this.edges.set(k, v);
    });
  }

  minus(select) {
    select.nodes.forEach((v, k) => {
      this.nodes.delete(k);
      v.class = v.class.replace(' highlight', '');
    });
    select.edges.forEach((v, k) => {
      this.edges.delete(k);
    });
  }

  xor(select) {
    select.nodes.forEach((v, k) => {
      if (this.nodes.has(k)) {
        this.nodes.delete(k);
        v.class = v.class.replace(' highlight', '');
      }
      else {
        this.nodes.set(k, v);
        if (!v.class.includes('highlight')) {
          v.class += ' highlight';
        }
      }
    });
    select.edges.forEach((v, k) => {
      this.edges.has(k) ? this.edges.delete(k) : this.edges.set(k, v);
    });
  }
};
