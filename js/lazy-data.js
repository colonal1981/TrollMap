/* TrollMap lazy data loader — keeps huge optional GIS datasets out of index.html. */
(function(){
  'use strict';
  const cache = Object.create(null);
  async function loadJson(path){
    if(cache[path]) return cache[path];
    const res = await fetch(path, { cache: 'force-cache' });
    if(!res.ok) throw new Error(`Failed to load ${path}: HTTP ${res.status}`);
    cache[path] = await res.json();
    return cache[path];
  }
  window.TrollMapData = {
    loadJson,
    loadBankPier: () => loadJson('./data/tristate-bank-pier.json'),
    loadPaddle:   () => loadJson('./data/tristate-paddle.json'),
    loadHotspots: () => loadJson('./data/tristate-hotspots.json'),
    preloadOptional: () => Promise.all([
      loadJson('./data/tristate-bank-pier.json'),
      loadJson('./data/tristate-paddle.json'),
      loadJson('./data/tristate-hotspots.json')
    ]),
    _cache: cache
  };
})();
