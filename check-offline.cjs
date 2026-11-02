// Offline navigation regression checks. No browser or third-party packages required.
// Fetch preserves a followed redirect through CacheStorage. Navigations use redirect:
// manual and reject that response; the fake cache deliberately preserves the flag.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(process.argv[2]||__dirname+'/dist/sw.js','utf8');
const HTML='<!doctype html><title>The crease</title><script id="cricket-core">test</script>';
function response(text=HTML,{redirected=false,status=200,type='text/html'}={}){
 const r=new Response(text,{status,headers:{'Content-Type':type}});
 if(redirected){Object.defineProperty(r,'redirected',{value:true});const clone=r.clone.bind(r);r.clone=()=>{const c=clone();Object.defineProperty(c,'redirected',{value:true});c.clone=()=>response(text,{redirected,status,type});return c;};}
 return r;
}
function worker(options={}){
 const origin='https://example.test',root=options.root||'/',base=origin+root+'sw.js',events={},stores=new Map(),requests=[],messages=[];
 const flags={...options},key=r=>new URL(typeof r==='string'?r:r.url,base).href;
 const cache=name=>{
  if(!stores.has(name))stores.set(name,new Map());const map=stores.get(name);
  return{async match(req){if(flags.readFails)throw Error('cache read failed');return map.get(key(req))?.clone();},async put(req,res){if(flags.writeFails)throw Error('cache full');map.set(key(req),res.clone());},async addAll(reqs){for(const req of reqs){const res=await network(req);if(!res.ok)throw Error('asset failed');await this.put(req,res);}}};
 };
 const network=async req=>{const url=key(req);requests.push(url);if(flags.offline)throw Error('offline');if(url.endsWith('index.html')||url===origin+root){return response(flags.networkHTML??HTML,{redirected:url.endsWith('index.html')||!!flags.rootRedirect,status:flags.status||200});}if(flags.assetFails)throw Error('missing icon');return response('asset',{type:'image/png'});};
 class Request extends global.Request{constructor(input,init){super(typeof input==='string'?new URL(input,base):input,init);}}
 const self={location:new URL(base),addEventListener:(n,fn)=>events[n]=fn,skipWaiting:async()=>{flags.skipped=true;},clients:{claim:async()=>{flags.claimed=true;},matchAll:async()=>[{postMessage:m=>messages.push(m)}]}};
 const caches={async open(name){if(flags.openFails)throw Error('storage blocked');return cache(name);},async keys(){return [...stores.keys()];},async delete(name){return stores.delete(name);},async match(req){for(const name of stores.keys()){const r=await cache(name).match(req);if(r)return r;}}};
 const context=vm.createContext({self,caches,fetch:network,Request,Response,URL,Headers,console});vm.runInContext(source,context);
 return{flags,requests,messages,stores,async install(){let p;events.install({waitUntil:v=>p=v});await p;},async activate(){let p;events.activate({waitUntil:v=>p=v});await p;},async update(){let p;events.message({data:{type:'check'},source:{postMessage:m=>messages.push(m)},waitUntil:v=>p=v});await p;},async navigate(path=root){let p;events.fetch({request:{url:origin+path,method:'GET',mode:'navigate',redirect:'manual'},respondWith:v=>p=v,waitUntil(){}});return p===undefined?undefined:await p;},async seed(name,text=HTML){await cache(name).put('./index.html',response(text,{redirected:true}));},async seedCurrent(){await vm.runInContext('caches.open(CACHE)',context).then(c=>c.put('./index.html',response(HTML,{redirected:true})));}};
}
let passed=0,failed=0;
async function check(name,fn){try{await fn();passed++;console.log('PASS '+name);}catch(e){failed++;console.log('FAIL '+name+': '+e.message);}}
async function game(res){assert.equal(res.status,200);assert.equal(res.redirected,false,'redirected cached HTML would cause a navigation network error');assert.equal(await res.text(),HTML);}
(async()=>{
 await check('First install then reload and offline reopen use navigation-safe HTML',async()=>{const w=worker();await w.install();await w.activate();await game(await w.navigate());w.flags.offline=true;await game(await w.navigate());assert(w.flags.skipped&&w.flags.claimed);});
 await check('Already-cached redirected HTML is repaired on read',async()=>{const w=worker({offline:true});await w.seedCurrent();await game(await w.navigate());});
 await check('Shell fetches the canonical directory URL, including subdirectory installs',async()=>{const w=worker({root:'/game/'});await w.install();assert(w.requests.includes('https://example.test/game/'));assert(!w.requests.some(u=>u.endsWith('index.html')));await game(await w.navigate('/game/index.html'));});
 await check('Redirected network responses are normalised before serving or caching',async()=>{const w=worker({rootRedirect:true});await game(await w.navigate());w.flags.offline=true;await game(await w.navigate());});
 await check('Blocked CacheStorage still permits online play',async()=>{const w=worker({openFails:true});await game(await w.navigate());});
 await check('Cache read or write failure cannot discard a successful network response',async()=>{for(const flag of ['readFails','writeFails']){const w=worker({[flag]:true});await game(await w.navigate());}});
 await check('Unavailable optional icons do not prevent the repaired worker installing',async()=>{const w=worker({assetFails:true});await w.install();assert(w.flags.skipped);await game(await w.navigate());});
 await check('Error or sign-in HTML cannot overwrite the cached game',async()=>{const w=worker();await w.install();for(const status of [200,403,503]){w.flags.networkHTML='<title>Sign in</title>';w.flags.status=status;await w.update();await game(await w.navigate());}assert.equal(w.messages.length,0);});
 await check('A valid update is cached and announced without navigating the page',async()=>{const w=worker();await w.install();w.flags.networkHTML=HTML+'<!-- update -->';await w.update();assert.equal(w.messages.length,1);assert.equal(w.messages[0].type,'update');assert.equal(await (await w.navigate()).text(),HTML+'<!-- update -->');});
 await check('No cache and no connection yields a readable retry page, not Response.error',async()=>{const w=worker({offline:true});const r=await w.navigate();assert.equal(r.status,503);assert.notEqual(r.type,'error');assert.match(await r.text(),/try again/i);});
 await check('Activation prunes only old game caches and leaves unrelated storage alone',async()=>{const w=worker();await w.seed('crease-r33');await w.seed('another-app');await w.install();await w.activate();assert(!w.stores.has('crease-r33'));assert(w.stores.has('another-app'));});
 await check('Other page routes are not intercepted',async()=>{const w=worker();assert.equal(await w.navigate('/other-page'),undefined);});
 console.log('\n'+passed+' passed, '+failed+' failed of '+(passed+failed)+' offline checks.');if(failed)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
