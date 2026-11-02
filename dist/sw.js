// Cricket · The crease - offline shell. This version repairs cached navigation redirects.
// The game remains cache-first; a changed page is offered through the existing Update ready UI.
const VERSION='r35',CACHE='crease-'+VERSION,ASSETS=['./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-512-maskable.png','./icon-180.png'],INDEX=new URL('./index.html',self.location.href).pathname,ROOT=INDEX.slice(0,-'index.html'.length);

// Static hosts may redirect /index.html to /. A followed redirect survives CacheStorage,
// but a navigation (redirect mode manual) cannot consume it. Fetch the canonical root
// and rebuild redirected responses, including any already present in the cache.
function navigationSafe(res){return res.redirected?new Response(res.body,{status:res.status,statusText:res.statusText,headers:res.headers}):res;}
async function isGame(res){return !!(res?.ok&&/text\/html/i.test(res.headers.get('content-type')||'')&&(await res.clone().text()).includes('<script id="cricket-core">'));}
async function readPage(){try{const c=await caches.open(CACHE),res=await c.match('./index.html');return await isGame(res)?navigationSafe(res):null;}catch{return null;}}
async function putPage(res){try{const c=await caches.open(CACHE);await c.put('./index.html',navigationSafe(res.clone()));return true;}catch{return false;}}
async function fetchPage(cache='no-cache'){
 const res=await fetch(new Request(ROOT,{cache}));
 // Do not let a gateway/sign-in/error page replace the playable offline copy.
 if(!await isGame(res))throw Error('Game page unavailable');
 return navigationSafe(res);
}
self.addEventListener('install',e=>{e.waitUntil((async()=>{
 const res=await fetchPage('reload');await putPage(res);
 // An icon failure must not strand players on the previous broken worker.
 await Promise.allSettled(ASSETS.map(async u=>{const req=new Request(u,{cache:'reload'}),asset=await fetch(req);if(asset.ok){const c=await caches.open(CACHE);await c.put(req,asset);}}));
 await self.skipWaiting();
})());});
self.addEventListener('activate',e=>{e.waitUntil((async()=>{
 let old=[];try{if(await readPage()){old=(await caches.keys()).filter(k=>k.startsWith('crease-')&&k!==CACHE);await Promise.all(old.map(k=>caches.delete(k)));}}catch{}
 await self.clients.claim();if(old.length)await notify();
})());});
function notify(){return self.clients.matchAll({includeUncontrolled:true}).then(cs=>cs.forEach(c=>c.postMessage({type:'update'})));}
async function check(client){
 try{const cached=await readPage(),res=await fetchPage(),text=await res.clone().text(),old=cached?await cached.text():null;
  if(old===text||!await putPage(res))return false;
  if(old===null)return false;if(client)client.postMessage({type:'update'});else await notify();return true;
 }catch{return false;}
}
self.addEventListener('message',e=>{if(e.data?.type==='check')e.waitUntil(check(e.source));});
async function shell(){
 const cached=await readPage();if(cached)return cached;
 try{const res=await fetchPage();await putPage(res);return res;}catch{
  return new Response('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>The crease - reconnect</title><body style="background:#101e19;color:#f5efdf;font:18px system-ui;padding:32px;max-width:36em"><h1>The crease</h1><p>The game could not load. Check your connection and try again.</p><p>Your saved career has not been deleted. There is no need to clear site data.</p><p><a style="color:#e4bf66" href="./">Try again</a></p>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
 }
}
async function asset(req){
 try{const hit=await caches.match(req,{ignoreSearch:true});if(hit)return hit;}catch{}
 const res=await fetch(req);if(res.ok)try{const c=await caches.open(CACHE);await c.put(req,res.clone());}catch{}return res;
}
self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 if(url.pathname===ROOT||url.pathname===INDEX){e.respondWith(shell());return;}
 if(/\.(webmanifest|png)$/.test(url.pathname))e.respondWith(asset(req));
});
