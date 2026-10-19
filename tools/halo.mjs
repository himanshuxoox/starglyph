// quick tuner: render ring world at t with different halo transforms
import { chromium } from 'playwright-core';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const ROOT='/home/claude/signal-lost';
const srv=http.createServer((q,r)=>{const p=path.join(ROOT,decodeURIComponent(q.url.split('?')[0])); if(!fs.existsSync(p)||fs.statSync(p).isDirectory()){r.writeHead(404);return r.end();} r.writeHead(200,{'Content-Type':p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':p.endsWith('.json')?'application/json':'text/html'}); fs.createReadStream(p).pipe(r);}).listen(0);
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const pg=await b.newPage({viewport:{width:720,height:1280}}); await pg.goto(`http://localhost:${srv.address().port}/index.html`); await pg.waitForFunction('window.READY');
const variants=JSON.parse(process.argv[2]); const out=process.argv[3]; let i=0;
for(const v of variants){ await pg.evaluate(v=>{halo.position.set(...v.p); halo.rotation.set(...v.r); renderAt(v.t);},v); await (await pg.$('#wrap')).screenshot({path:`${out}/h${i++}.png`}); }
await b.close(); srv.close();
