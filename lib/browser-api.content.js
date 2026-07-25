// Versão "classic script" (sem import/export) do shim de compatibilidade,
// pensada para content scripts, que no MV3 não podem ser carregados como módulos ES.
// Exposta em window.VF para ser usada pelos outros content scripts.
(function () {
  const ext = typeof browser !== "undefined" ? browser : chrome;
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

  const storage = {
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

  window.VF = { storage };
})();
