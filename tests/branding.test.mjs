import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const css=readFileSync(new URL('../app/migrated.css',import.meta.url),'utf8');
function luminance(hex) {
  const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
test('hospital logo is reused on login and navigation; brand text maintains readable contrast',()=>{
  assert.ok(existsSync(new URL('../public/上海市第六人民医院.webp',import.meta.url)));
  for(const file of ['account-client.tsx','teaching-platform.tsx']) assert.match(readFileSync(new URL('../app/'+file,import.meta.url),'utf8'),/src="\/上海市第六人民医院.webp"/);
  for(const token of ['primary','primary-strong','text','muted']) {
    const color=css.match(new RegExp('--'+token+': (#[a-f0-9]{6});'))[1];
    assert.ok(1.05/(luminance(color)+.05)>=4.5,`${token}: white contrast`);
  }
  assert.match(css,/\.teaching-mark-circle[^\n]*#36baff/); // annotation palette is not a brand token
});
