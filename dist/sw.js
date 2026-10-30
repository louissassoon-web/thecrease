// Cricket · The crease - offline shell. Bump VERSION when the file list changes. The page is served from
// the cache; on launch and on return to the foreground the page asks this worker to compare the cached
// index.html with the network copy, and the game offers "Update ready" when it has changed. Only the game's
// own URL (the scope root or index.html) is served from the cache; other pages on the origin are not touched.
const VERSION='r33',CACHE='crease-'+VERSION,SHELL=['./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon-512-maskable.png','./icon-180.png'],INDEX=new URL('./index.html',self.location.href).pathname,ROOT=INDEX.slice(0,-'index.html'.length);
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL.map(u=>new Request(u,{cache:'reload'})))).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>{const old=keys.filter(k=>k.startsWith('crease-')&&k!==CACHE);return Promise.all(old.map(k=>caches.delete(k))).then(()=>self.clients.claim()).then(()=>{if(old.length)notify();});}));});
function notify(){return self.clients.matchAll({includeUncontrolled:true}).then(cs=>cs.forEach(c=>c.postMessage({type:'update'})));}
// Compare the cached page with the network copy. When it has changed, cache the new copy and tell the page
// that asked (or every page, when no page asked), which offers the reload; nothing reloads by itself.
async function check(client){
 try{const cache=await caches.open(CACHE),cached=await cache.match('./index.html'),res=await fetch(new Request(INDEX,{cache:'no-cache'}));if(!res.ok)return false;
  const text=await res.clone().text(),old=cached?await cached.clone().text():null;if(old===text)return false;await cache.put('./index.html',res.clone());
  if(old===null)return false;if(client)client.postMessage({type:'update'});else await notify();return true;}catch{return false;}
}
self.addEventListener('message',e=>{if(e.data?.type==='check')e.waitUntil(check(e.source));});
async function shell(){
 const cache=await caches.open(CACHE),cached=await cache.match('./index.html');if(cached)return cached;
 try{const res=await fetch(new Request(INDEX,{cache:'no-cache'}));if(res.ok)await cache.put('./index.html',res.clone());return res;}catch{return Response.error();}
}
self.addEventListener('fetch',e=>{
 const req=e.request;if(req.method!=='GET')return;const url=new URL(req.url);if(url.origin!==self.location.origin)return;
 if(url.pathname===ROOT||url.pathname===INDEX){e.respondWith(shell());return;}
 if(/\.(webmanifest|png)$/.test(url.pathname))e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(res=>{if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}return res;})));
});
