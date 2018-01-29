const consoleInfo = false;

export function consoleLog (...args) {
  consoleInfo && console.log('[Virtual Scroller]:', ...args);
}

export class SumTree {

  constructor () {
    this._tree = [];
    this._revertedTree = true;
  }

  /**
   * Allows to iterate over the instance
   * @return {{next: Function}}
   */
  [Symbol.iterator] () {
    let index = 0;
    return {
      next () {
        return {
          value: this.sumAt(index++),
          done: index >= this._tree.length
        };
      }
    };
  }

  /**
   * Updating the tree between `from` and `to`
   * elements with custom values
   * @param {number[]} values
   * @param {number} from
   * @param {number} to
   */
  update ({ values = [], from = 0, to = values.length - 1 }) {
    this._assertEqual(to - from + 1, values.length, 'Received lengths must be equal');
    this._assertEqual(values.length <= this._tree.length, true, 'Sub array must be less than original tree');
    this._assertEqual(to - from >= 0, true, '`From` must be less than `to`');

    consoleLog(from, to, values, 'length:', values.length);
    consoleLog('original tree:', this._tree.slice());

    if (this._revertedTree) {
      // updating reverted tree
      let prevValue = this._tree[ to + 1 ];
      let diffValue = 0;
      let accumulator = prevValue || 0;
      for (let index = to, valuesIndex = values.length - 1; index >= from; --index) {
        accumulator += values[ valuesIndex-- ];
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
      // updating normal tree
      let prevValue = this._tree[ from - 1 ];
      let diffValue = 0;
      let accumulator = prevValue || 0;
      for (let index = from, valuesIndex = 0; index <= to; ++index) {
        accumulator += values[ valuesIndex++ ];
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
    consoleLog('modified tree:', this._tree.slice());
  }

  /**
   * Returns sum of the element with specified index
   * @param {number} elementIndex
   * @return {number}
   */
  sumAt (elementIndex) {
    return this.sumBetween(0, elementIndex);
  }

  /**
   * Returns sum between two elements with specified indexes
   * @param {number} fromIndex
   * @param {number} endIndex
   * @return {number}
   */
  sumBetween (fromIndex = 0, endIndex = this._tree.length - 1) {
    return this._revertedTree
      ? this._tree[fromIndex] - (this._tree[endIndex + 1] || 0)
      : this._tree[endIndex] - (this._tree[fromIndex - 1] || 0);
  }

  /**
   * Extends tree by `number` with pad `value`
   * @param {number} number
   * @param {number} value
   */
  extendBy (number, value = 0) {
    consoleLog(`adding ${number} elements`);
    this._tree = this._tree.concat(
      Array(number).fill(0)
    );
    let newItems = Array(number).fill(value);
    this.update({
      from: this._tree.length - number,
      to: this._tree.length - 1,
      values: newItems
    });
  }

  /**
   * Reduce tree by `number`
   * @param number
   */
  reduceBy (number) {
    consoleLog(`reducing by ${number} elements`);
    if (this._revertedTree) {
      let deletedSum = this._tree[ this._tree.length - number ];
      for (let index = this._tree.length - number - 1; index >= 0; --index) {
        this._tree[ index ] -= deletedSum;
      }
    }
    this._tree.splice(-number);
  }

  /**
   * Performance mode
   * `descending` - start is the most powerful for CPU but reduced to the end
   * other modes - start is the most expensive for CPU but better to the end
   * @default descending
   * @param {*} mode
   */
  setPerformanceMode (mode = SumTree.descending) {
    // todo: fix wrong height with ascending mode (needs investigation)
    // although descending mode is more useful for us in most cases
    this._revertedTree = mode === SumTree.descending;
  }

  /**
   * Free memory by removing the tree
   */
  clear () {
    this._tree = [];
  }

  /**
   * Assert that two values are identically with strict equal
   * @param {*} value1
   * @param {*} value2
   * @param {string} message
   * @private
   */
  _assertEqual (value1, value2, message) {
    if (value1 !== value2) {
      // throw new Error(message);
      console.error(value1, value2, message);
    }
  }
}

SumTree.descending = 1;
SumTree.ascending = 2;
