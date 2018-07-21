'use strict';

export default class Selection {
  /**
   * Creates a selection object.
   * @param select - a selection, array of nodes/edges or node/edge
   */
  constructor(select) {
    this._nodes = new Map();
    this._edges = new Map();
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
            this._edges.set(d.hash, d);
            break;
          }
          case 'note': {
            this._nodes.set(d.hash, d);
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
            this._edges.delete(d.hash);
            break;
          }
          case 'note': {
            this._nodes.delete(d.hash);
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
            this._edges.has(d.hash) ? this._edges.delete(d.hash) : this._edges.set(d.hash, d);
            break;
          }
          case 'note': {
            if (this._nodes.has(d.hash)) {
              this._nodes.delete(d.hash);
              d.class = d.class.replace(' highlight', '');
            }
            else {
              this._nodes.set(d.hash, d);
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
    this.deselect([...this._nodes.values()]);
  }

  /**
   * clear edges in selection
   */
  clearEdges() {
    this._edges.clear();
  }

  merge(select) {
    select._nodes.forEach((v, k) => {
      this._nodes.set(k, v);
      if (!v.class.includes('highlight')) {
        v.class += ' highlight';
      }
    });
    select._edges.forEach((v, k) => {
      this._edges.set(k, v);
    });
  }

  minus(select) {
    select._nodes.forEach((v, k) => {
      this._nodes.delete(k);
      v.class = v.class.replace(' highlight', '');
    });
    select._edges.forEach((v, k) => {
      this._edges.delete(k);
    });
  }

  xor(select) {
    select._nodes.forEach((v, k) => {
      if (this._nodes.has(k)) {
        this._nodes.delete(k);
        v.class = v.class.replace(' highlight', '');
      }
      else {
        this._nodes.set(k, v);
        if (!v.class.includes('highlight')) {
          v.class += ' highlight';
        }
      }
    });
    select._edges.forEach((v, k) => {
      this._edges.has(k) ? this._edges.delete(k) : this._edges.set(k, v);
    });
  }

  get size() {
    return this._nodes.size + this.edges.size;
  }

  set size(_) {
  }

  get nodes() {
    return this._nodes;
  }

  set nodes(_) {
  }

  get edges() {
    return this._edges;
  }

  set edges(_) {
  }

};
