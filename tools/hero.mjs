// close-up turnaround of the hero: node tools/hero.mjs t out.png  (4 views, raw + ascii)
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const srv=http.createServer((q,r)=>{const p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0])); if(!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();} r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':'text/html'}); fs.createReadStream(p).pipe(r);}).listen(0);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const pg=await b.newPage({viewport:{width:720,height:1280}}); pg.on('pageerror',e=>console.log('[err]',e.message));
pg.on('console',m=>{const s=m.text(); if(/error/i.test(s)) console.log('[page]',s.slice(0,800));});
await pg.goto(`http://localhost:${srv.address().port}/index.html`); await pg.waitForFunction('window.READY');
const t=+process.argv[2], out=process.argv[3]; let i=0;
for (const [ang, raw] of [[Math.PI,true],[Math.PI*0.7,true],[Math.PI*1.3,true],[Math.PI,false],[Math.PI*0.75,false]]) {
  await pg.evaluate(({t,ang,raw})=>{ renderAt(t); const {engine,scene,camera}=__dbg; const hp=__dbg.hero.root.position;
    camera.position.set(hp.x+Math.sin(ang)*(raw?1.4:3.2), hp.y+(raw?1.6:1.3), hp.z+Math.cos(ang)*(raw?1.4:3.2)); camera.lookAt(hp.x, hp.y+(raw?1.45:1.0), hp.z);
    document.getElementById('hud').style.display='none';
    if (raw) { const r=engine.renderer; r.setRenderTarget(null); r.render(scene,camera);} else engine.render(scene,camera); },{t,ang,raw});
  await (await pg.$('#wrap')).screenshot({path:`${out}_${i++}.png`});
}
await b.close(); srv.close();
