// Camada mínima de compatibilidade entre Chrome (callbacks) e Firefox (promises),
// sem depender de bibliotecas externas.
export const ext = typeof browser !== "undefined" ? browser : chrome;
const isNative = typeof browser !== "undefined";

function promisify(fn, thisArg) {
  return (...args) =>
    new Promise((resolve, reject) => {
      fn.call(thisArg, ...args, (result) => {
        const err = ext.runtime.lastError;
        if (err) reject(new Error(err.message));
        else resolve(result);
      });
    });
}

export const storage = {
  get(area, keys) {
    const target = ext.storage[area];
    if (isNative) return target.get(keys);
    return promisify(target.get, target)(keys);
  },
  set(area, items) {
    const target = ext.storage[area];
    if (isNative) return target.set(items);
    return promisify(target.set, target)(items);
  },
  onChanged: ext.storage.onChanged,
};

export const tabs = {
  query(queryInfo) {
    if (isNative) return ext.tabs.query(queryInfo);
    return promisify(ext.tabs.query, ext.tabs)(queryInfo);
  },
};
