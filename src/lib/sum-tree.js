export class SumTree {

  constructor () {
    this._tree = [];
    this._revertedTree = true;
  }

  update ({ from = 0, to = values.length - 1, values = [] }) {
    this._assertEqual(to - from, values.length, 'Received lengths must be equal');
    this._assertEqual(values.length <= this._tree.length, true, 'Sub array must be less than original tree');
    this._assertEqual(to - from >= 0, true, '`From` must be less than `to`');

    let prevValue = this._tree[ this._normalizeTreeIndex(from - 1) ];
    let diffValue = 0;
    let accumulator = prevValue || 0;
    for (let index = from; index <= to; ++index) {
      accumulator += values[ index ];
      if (index === to) {
        diffValue = accumulator - this._tree[ this._normalizeTreeIndex(index) ];
      }
      this._tree[ this._normalizeTreeIndex(index) ] = accumulator;
    }

    // update rest array after element with index `to`
    for (let index = to + 1, length = this._tree.length; index < length; ++index) {
      this._tree[ this._normalizeTreeIndex(index) ] += diffValue;
    }
  }

  extendBy (number, value = 0) {
    let newItems = Array(number).fill(value);
    this._tree = this._revertedTree
      ? newItems.concat(this._tree) : this._tree.concat(newItems);
  }

  reduceBy (number) {
    this._revertedTree
      ? this._tree.splice(0, number) : this._tree.splice(-number);
  }

  /**
   * Performance mode
   * `descending` - start is the most powerful but reduced to the end
   * other modes - start is the most expensive for CPU but better to the end
   * @param mode
   */
  setPerformanceMode (mode = 'descending') {
    this._revertedTree = mode === 'descending';
  }

  clear () {
    this._tree = [];
  }

  get firstIndex () {
    return this._normalizeTreeIndex(0);
  }

  get lastIndex () {
    return this._normalizeTreeIndex(this._tree.length - 1);
  }

  _normalizeTreeIndex (index) {
    return this._revertedTree
      ? this._tree.length - 1 - index : index;
  }

  _assertEqual (value1, value2, message) {
    if (value1 !== value2) {
      throw new Error(message);
    }
  }
}
