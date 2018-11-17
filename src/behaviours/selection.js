'use strict';

export default class Selection {
  /**
   * Creates a selection object.
   * @param select - a selection, array of nodes/edges or node/edge
   */
  constructor(select) {
    this._nodes = new Map();
    this._edges = new Map();
    this._groups = new Map();
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
        const hash = d.hash ? d.hash : d.predicate.hash;
        switch (hash.substring(0, 4)) {
          case 'edge': {
            this.addEdge(d);
            break;
          }
          case 'note': {
            this.addNode(d);
            break;
          }
          default: {
            console.warn('Unkown element in selection.');
          }
        }
      });
    }
  }

  addNode(d) {
    this._nodes.set(d.hash, d);
    if (!d.class.includes('highlight')) {
      d.class += ' highlight';
    }
  }

  delNode(d) {
    this._nodes.delete(d.hash);
    d.class = d.class.replace(' highlight', '');
  }

  addEdge(d) {
    this._edges.set(d.predicate.hash, d);
    d.predicate.class += ' highlight';
  }

  delEdge(d) {
    this._edges.delete(d.predicate.hash);
    d.predicate.class = d.predicate.class.replace(' highlight', '');
  }

  addGroup(d) {
    this._groups.set(d.id, d);
    if (!d.class.includes('highlight')) {
      d.class += ' highlight';
    }
  }

  delGroup(d) {
    this._groups.delete(d.id);
    d.class = d.class.replace(' highlight', '');
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
        const hash = d.hash ? d.hash : d.predicate.hash;
        switch (hash.substring(0, 4)) {
          case 'edge': {
            this.delEdge(d);
            break;
          }
          case 'note': {
            this.delNode(d);
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
        const hash = d.hash ? d.hash : d.predicate.hash;
        switch (hash.substring(0, 4)) {
          case 'edge': {
            if (this._edges.has(hash)) {
              this.delEdge(d);
            }
            else {
              this.addEdge(d);
            }
            break;
          }
          case 'note': {
            if (this._nodes.has(hash)) {
              this.delNode(d);
            }
            else {
              this.addNode(d);
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
    this.deselect([...this._edges.values()]);
  }

  merge(select) {
    select._nodes.forEach((v) => {
      this.addNode(v);
    });
    select._edges.forEach((v) => {
      this.addEdge(v);
    });
  }

  minus(select) {
    select._nodes.forEach((v) => {
      this.delNode(v);
    });
    select._edges.forEach((v) => {
      this.delEdge(v);
    });
  }

  xor(select) {
    select._nodes.forEach((v, k) => {
      if (this._nodes.has(k)) {
        this.delNode(v);
      }
      else {
        this.addNode(v);
      }
    });
    select._edges.forEach((v, k) => {
      if (this._edges.has(k)) {
        this.delEdge(v);
      }
      else {
        this.addEdge(v);
      }
    });
  }

  includes(id) {
    return this._nodes.has(id) || this._edges.has(id) || this._groups.has(id);
  }

  get size() {
    return this._nodes.size + this._edges.size + this._groups.size;
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

  get groups() {
    return this._groups;
  }

  set groups(_) {
  }

};
