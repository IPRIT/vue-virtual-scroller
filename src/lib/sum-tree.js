export class SumTree {

  constructor () {
    this._tree = [];
    this._revertedTree = true;
  }

  [Symbol.iterator] () {
    let index = 0;
    return {
      next () {
        return {
          value: this.sumAt(index++),
          done: index >= this._tree.length
        }
      }
    }
  }

  update ({ from = 0, to = values.length - 1, values = [] }) {
    this._assertEqual(to - from, values.length, 'Received lengths must be equal');
    this._assertEqual(values.length <= this._tree.length, true, 'Sub array must be less than original tree');
    this._assertEqual(to - from >= 0, true, '`From` must be less than `to`');

    if (this._revertedTree) {
      let prevValue = this._tree[ to + 1 ];
      let diffValue = 0;
      let accumulator = prevValue || 0;
      for (let index = to; index >= from; --index) {
        accumulator += values[ index ];
        if (index === from) {
          diffValue = accumulator - this._tree[ from ];
        }
        this._tree[ index ] = accumulator;
      }
      // update the rest array before `from` index
      for (let index = from - 1; index >= 0; --index) {
        this._tree[ index ] += diffValue;
      }
    } else {
      let prevValue = this._tree[ from - 1 ];
      let diffValue = 0;
      let accumulator = prevValue || 0;
      for (let index = from; index <= to; ++index) {
        accumulator += values[ index ];
        if (index === to) {
          diffValue = accumulator - this._tree[ to ];
        }
        this._tree[ index ] = accumulator;
      }
      // update the rest array after `to` index
      for (let index = to + 1; index < this._tree.length; ++index) {
        this._tree[ index ] += diffValue;
      }
    }
  }

  sumAt (elementIndex) {
    return this.sumBetween(0, elementIndex);
  }

  sumBetween (fromIndex = 0, endIndex = this._tree.length - 1) {
    return this._revertedTree
      ? this._tree[fromIndex] - (this._tree[endIndex + 1] || 0)
      : this._tree[endIndex] - (this._tree[fromIndex - 1] || 0);
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
  setPerformanceMode (mode = SumTree.descending) {
    this._revertedTree = mode === SumTree.descending;
  }

  clear () {
    this._tree = [];
  }

  _assertEqual (value1, value2, message) {
    if (value1 !== value2) {
      // throw new Error(message);
      console.error(message);
    }
  }
}

SumTree.descending = 1;
SumTree.ascending = 2;
