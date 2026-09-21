const {test}=require('node:test');
const assert=require('node:assert/strict');
const config=require('../next.config.js');
const manifest=require('../package.json');
test('untrusted images are served directly without the optimizer',()=>{
  assert.equal(config.images.unoptimized,true);
  assert.equal((config.images.remotePatterns||[]).some(p=>p.hostname==='**'),false);
});
test('framework and React versions are pinned to the reviewed patched releases',()=>{
  assert.equal(manifest.dependencies.next,'16.3.5');
  assert.equal(manifest.dependencies.react,'19.3.0');
  assert.equal(manifest.dependencies['react-dom'],'19.3.0');
  assert.equal(manifest.devDependencies['eslint-config-next'],'16.3.5');
});
