export class ArrayIterator {
  constructor(ite) {
    this._ite = ite;
  }
  find(fn, thisArg = undefined) {
    for (const [k, v] of this._ite) {
      if (fn.call(thisArg, v, k)) return v;
    }
  }
  findIndex(fn, thisArg = undefined) {
    for (const [k, v] of this._ite) {
      if (fn.call(thisArg, v, k)) return k;
    }
    return -1;
  }
  map(fn) {
    return new ArrayIterator(function* (ite, fn) {
      let i = 0;
      for (const [k, v] of ite) yield [i++, fn(v, k)];
    }(this._ite, fn));
  }
  flatMap(fn) {
    return new ArrayIterator(function* (ite, fn) {
      let i = 0;
      for (const [k, v] of ite) {
        const arr = fn(v, k);
        if (!Array.isArray(arr)) throw new Error('flatMap callback should return array.');
        for (const a of arr) yield [i++, a];
      }
    }(this._ite, fn));
  }
  toArray() {
    const arr = [];
    for (const [k, v] of this._ite) arr.push(v);
    return arr;
  }
  join(separator = '') {
    return this.toArray().join(separator);
  }
  toString(separator = '') {
    return this.join(separator);
  }
  [Symbol.iterator]() {
    return function* (ite) {
      for (const [k, v] of ite) yield v;
    }(this._ite);
  }
}

export default function seq(ite) {
  let gen;
  if (typeof ite === 'number') {
    gen = function* (n) {
      for (let i = 0; i < n; i++) yield [i, i];
    };
  } else if (ite != null && typeof ite[Symbol.iterator] === 'function') {
    gen = function* (ite) {
      let i = 0;
      for (const v of ite) yield [i++, v];
    };
  } else {
    gen = function* (obj) {
      for (const kv of Object.entries(obj)) yield kv;
    };
  }
  return new ArrayIterator(gen(ite));
}
