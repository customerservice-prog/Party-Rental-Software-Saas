const {test}=require('node:test');
const assert=require('node:assert/strict');
const config=require('../next.config.js');
const manifest=require('../package.json');
test('untrusted images are served directly without the vulnerable optimizer',()=>{
  assert.equal(config.images.unoptimized,true);
  assert.equal((config.images.remotePatterns||[]).some(p=>p.hostname==='**'),false);
});
test('targeted advisory overrides do not force unrelated major upgrades',()=>{
  assert.equal(manifest.overrides.next.postcss,'^8.5.23');
  assert.equal(manifest.overrides['@next/eslint-plugin-next'].glob,'^10.5.0');
  assert.equal(manifest.overrides['@typescript-eslint/typescript-estree'].minimatch,'^9.0.7');
});
