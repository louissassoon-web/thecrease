// Real UI handlers in a small DOM facade. This does not emulate browser layout.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const html=fs.readFileSync(__dirname+'/dist/index.html','utf8'),core=s=>s.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1];
vm.runInThisContext(core(html));const C=Cricket,copy=x=>JSON.parse(JSON.stringify(x));let checks=0;
async function check(name,fn){try{await fn();console.log('PASS '+name);checks++;}catch(e){console.error('FAIL '+name+'\n'+e.stack.slice(0,2400));process.exit(1);}}
function career(format='T20') {for(let seed=1;seed<100;seed++){const league=C.Season.create(seed,format,'eng'),contest=C.Season.begin(league);if(C.Contest.ownTurn(contest))return{league,contest,match:C.Contest.current(contest),recorded:false,...C.Restart.view()};}}
function replaceFunction(s,name,body){const start=s.indexOf(' function '+name+'('),brace=s.indexOf('{',start);let end=brace,depth=0;do{if(s[end]==='{')depth++;if(s[end]==='}')depth--;end++;}while(depth);return s.slice(0,brace)+'{'+body+'}'+s.slice(end);}
function host(format='T20',savedApp=null,options={}){
 const nodes=[],byId=new Map(),layers=[],callbacks=new Map(),storage=new Map();let now=0,fullscreenFailure=false;const rafQueue=[];
 class Node{
  constructor(tag,attrs={}){this.tag=tag;this.attrs=attrs;this.id=attrs.id;this.className=attrs.class||'';this.children=[];this.parentElement=null;this.style={};this.dataset={};this.hidden='hidden'in attrs;this.disabled=false;this.open=false;this.textContent='';this.listeners=new Map();this.captured=new Set();nodes.push(this);if(this.id)byId.set(this.id,this);}
  matches(selector){return selector.split(',').some(raw=>{const s=raw.trim();if(s[0]==='#')return this.id===s.slice(1);if(s[0]==='.')return this.className.split(' ').includes(s.slice(1));const tag=s.match(/^\w+/)?.[0];if(tag&&tag!==this.tag)return false;for(const m of s.matchAll(/\[([\w-]+)=["']([^"']+)["']\]/g))if(this.attrs[m[1]]!==m[2])return false;return !!tag;});}
  closest(selector){for(let n=this;n;n=n.parentElement)if(n.matches(selector))return n;return null;}
  append(...children){for(const n of children){if(n&&typeof n==='object')n.parentElement=this;this.children.push(n);}}
  replaceChildren(...children){this.children=[];this.append(...children);}
  createTHead(){if(!this.tHead){this.tHead=new Node('thead');this.append(this.tHead);}return this.tHead;}
  insertRow(){const row=new Node('tr');this.append(row);return row;}
  insertCell(){const cell=new Node('td');this.append(cell);return cell;}
  setAttribute(k,v){this.attrs[k]=v;}
  addEventListener(type,fn){if(!this.listeners.has(type))this.listeners.set(type,[]);this.listeners.get(type).push(fn);}
  async dispatch(type,event={}){for(const fn of this.listeners.get(type)||[])await fn({target:this,preventDefault(){},...event});}
  async click(){assert.ok(!this.disabled,'Button disabled: '+this.id);const modal=nodes.find(n=>n.open);if(modal){assert.equal(layers.at(-1),modal,'Paused dialog is behind fullscreen');assert.equal(this.closest('dialog'),modal,'Game is inert behind a modal');}await this.dispatch('click');}
  close(){this.open=false;const i=layers.indexOf(this);if(i>=0)layers.splice(i,1);}
  showModal(){this.open=true;layers.push(this);}
  focus(){document.activeElement=this;}
  getContext(){if(options.canvasFactory){if(!this.context){this.nativeCanvas=options.canvasFactory(this);const context=this.nativeCanvas.getContext('2d'),node=this;this.drawCalls=0;this.context=new Proxy(context,{get(target,key){const value=target[key];if(typeof value!=='function')return value;return(...args)=>{node.drawCalls++;return value.apply(target,args.map(a=>a?.nativeCanvas||a));};},set(target,key,value){target[key]=value;return true;}});}return this.context;}if(!this.context){const node=this,gradient={addColorStop(){}};this.drawCalls=0;this.context=new Proxy({measureText:text=>({width:String(text).length*7}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get(target,key){if(key in target)return target[key];return(...args)=>{for(const v of args)if(typeof v==='number')assert.ok(Number.isFinite(v),'Non-finite canvas coordinate: '+String(key));node.drawCalls++;};},set(target,key,value){target[key]=value;return true;}});}return this.context;}
  getBoundingClientRect(){return options.rect?options.rect(this):{left:0,top:100,width:390,height:document.documentElement.dataset.view==='full'?690:400};}
  setPointerCapture(id){this.captured.add(id);}
  hasPointerCapture(id){return this.captured.has(id);}
  releasePointerCapture(id){this.captured.delete(id);}
 }
 const markup=html.slice(html.indexOf('<body>'),html.indexOf('<script id="cricket-core">')),stack=[];
 for(const m of markup.matchAll(/<(\/?)([a-z][\w-]*)([^>]*)>/gi)){const closing=m[1],tag=m[2].toLowerCase();if(closing){if(stack.at(-1)?.tag===tag)stack.pop();continue;}const attrs={};for(const a of m[3].matchAll(/([\w-]+)(?:="([^"]*)")?/g))attrs[a[1]]=a[2]??'';const n=new Node(tag,attrs);stack.at(-1)?.append(n);if(!['input','br','hr','img','meta','link'].includes(tag)&&!m[3].endsWith('/'))stack.push(n);}
 const root=new Node('html'),document={documentElement:root,body:nodes.find(n=>n.tag==='body'),activeElement:null,fullscreenElement:null,hidden:false,getElementById:id=>{assert.ok(byId.has(id),'Missing '+id);return byId.get(id);},querySelectorAll:s=>nodes.filter(n=>n.matches(s)),querySelector:s=>nodes.find(n=>n.matches(s)),createElement:tag=>new Node(tag),createTextNode:text=>({textContent:text}),addEventListener:(type,fn)=>callbacks.set('document:'+type,fn)};
 root.requestFullscreen=async()=>{if(fullscreenFailure)throw Error('Unsupported');document.fullscreenElement=root;layers.push(root);callbacks.get('document:fullscreenchange')?.();};
 document.exitFullscreen=async()=>{document.fullscreenElement=null;const i=layers.indexOf(root);if(i>=0)layers.splice(i,1);callbacks.get('document:fullscreenchange')?.();};
 const initial=career(format);if(!options.fresh)storage.set('cricket.career.v5',options.rawSave??JSON.stringify(savedApp||C.CareerSave.pack({schema:5,active:format,sessions:{[format]:initial},legacy:null})));let writes=0,frames=0;
 const window={...options.window,addEventListener:(type,fn)=>callbacks.set('window:'+type,fn)},box={Cricket,document,window,performance:{now:()=>now},crypto:require('node:crypto').webcrypto,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>{if(options.failWrites)throw Error('Storage full');writes++;storage.set(k,v);},removeItem:k=>storage.delete(k)},navigator:options.navigator||{},ResizeObserver:class{constructor(fn){callbacks.set('resizeObserver',fn);}observe(){}},requestAnimationFrame:fn=>{rafQueue.push(fn);return ++frames;},devicePixelRatio:2,innerWidth:390,innerHeight:844,setTimeout,clearTimeout,Blob,URL};
 let source=html.match(/<script id="cricket-ui">([\s\S]*?)<\/script>/)[1];if(!options.realResize)source=replaceFunction(source,'resize',"fieldSize={w:390,h:viewSetting==='full'?690:400};");const end=source.lastIndexOf('})();');source=source.slice(0,end)+'const paintedBalls=[];const originalPaintBall=paintBall;paintBall=(p,t)=>{paintedBalls.push({...p});originalPaintBall(p,t);};globalThis.u={Platform,Sound,SoundPalette,openDemo,finishDemo,drawDemo,demo:()=>demo,app:()=>app,shiftBowlingGallery,galleryLines,returnChoiceWaiting,chooseReturn,bowlingCamera,bowlerWorld,activeOwner,renderSettings,takePaintedBalls:()=>paintedBalls.splice(0),catchTargets:()=>catchTargets,runoutChance,fieldCamera,clearDelivery,drawBowlingGuide,renderBowling,renderTools,frame,shopAvailable,get:()=>state,gesture:()=>gesture,isPaused:()=>paused,openDialog,closeDialogs,renderUI,chooseDisplay,fullscreenChanged,pointerDown,pointerMove,pointerUp,pointerCancel,clock,resize,matchMessage,drawField,drawPad,soundTick:Sound.tick,renderBrief,renderArrival,renderShop,teamKit,groundModel,presentation:()=>({visualClock,camera:copyCamera(),reducedMotion}),renderCelebration,beginCeremony,finishCeremony,drawResultScene,maybeCeremony,ceremony:()=>ceremony,leagueTitle,fielderIdentity,declarationWindow};function copyCamera(){return {...camera};}'+source.slice(end);vm.createContext(box);vm.runInContext(source,box);
 return{flushRAF:()=>{for(const fn of rafQueue.splice(0))fn(now);},writes:()=>writes,frames:()=>frames,u:box.u,n:id=>document.getElementById(id),document,layers,storage,callbacks,advance:ms=>{now+=ms;},step:(ms=100)=>{now+=ms;box.u.clock(now);box.u.soundTick();},failFullscreen:()=>{fullscreenFailure=true;}};
}
function pointer(target,x,y,more={}){return{target,pointerId:4,pointerType:'touch',isPrimary:true,clientX:x,clientY:y,button:0,cancelable:true,prevented:false,preventDefault(){this.prevented=true;},...more};}
module.exports={host,pointer,C,copy};
if(require.main===module)(async()=>{
await check('Fullscreen preserves the active modal above the game, then actual Resume and Bowl buttons work',async()=>{
 const h=host();await h.n('settingsBtn').click();h.n('fullScreenToggle').focus();h.n('fullScreenToggle').checked=true;await h.n('fullScreenToggle').dispatch('change');assert.equal(h.layers.at(-1),h.n('settingsDialog'));assert.equal(h.document.fullscreenElement,h.document.documentElement);assert.equal(h.document.activeElement,h.n('fullScreenToggle'));assert.equal(h.u.isPaused(),true);
 await h.n('settingsResumeBtn').click();assert.equal(h.u.isPaused(),false);assert.ok(!h.layers.some(n=>n.tag==='dialog'));await h.n('bowlBtn').click();assert.equal(h.u.get().fieldBrief,true);await h.n('readyBallBtn').click();assert.equal(h.u.get().fieldBrief,false);assert.equal(h.u.get().elapsed,-850);
});
await check('Touch release has identical direction and timing in pad and fullscreen views; buttons do not become shots',async()=>{
 const shots=[];for(const full of [false,true]){const h=host();await h.n('settingsBtn').click();if(full)await h.u.chooseDisplay(true);await h.n('settingsResumeBtn').click();h.u.resize();await h.n('bowlBtn').click();await h.n('readyBallBtn').click();const s=h.u.get(),surface=h.n(full?'fieldCanvas':'swipePad'),seed=s.match.rngState;s.elapsed=s.pending.duration-80;
  const buttonEvent=pointer(h.n('menuBtn'),370,25);h.u.pointerDown(buttonEvent);assert.equal(h.u.gesture(),null);assert.equal(buttonEvent.prevented,false);
  h.u.pointerDown(pointer(surface,160,350));assert.equal(surface.hasPointerCapture(4),true);h.u.pointerDown(pointer(surface,170,360,{pointerId:5,isPrimary:false}));h.u.pointerMove(pointer(surface,230,300));h.advance(80);h.u.pointerUp(pointer(surface,230,300));assert.equal(surface.hasPointerCapture(4),false);assert.equal(h.u.gesture(),null);assert.equal(s.shot.error,0);assert.equal(s.match.rngState,seed);assert.equal(s.match.history.length,0);shots.push(copy(s.shot));
 }assert.deepEqual(shots[0],shots[1]);
});
await check('Release beyond the field is retained, while cancelled gestures pause without recording a shot',async()=>{
 for(const cancel of [false,true]){const h=host();await h.n('resumeBtn').click();await h.n('bowlBtn').click();await h.n('readyBallBtn').click();const s=h.u.get(),field=h.n('fieldCanvas');s.elapsed=s.pending.duration-50;h.u.pointerDown(pointer(field,370,600));h.advance(50);
  if(cancel){h.u.pointerCancel(pointer(field,480,900));assert.equal(s.shot,null);assert.equal(h.u.isPaused(),true);assert.equal(h.layers.at(-1),h.n('menuDialog'));}
  else{h.callbacks.get('window:pointerup')(pointer(h.document.body,480,900));assert.equal(s.shot.error,0);assert.ok(s.shot.effort>0);}
  assert.equal(field.hasPointerCapture(4),false);assert.equal(h.u.gesture(),null);
 }
});
await check('The live clock accepts a defensive spin swipe throughout its wider contact window',async()=>{
 const h=host('TEST');await h.n('resumeBtn').click();await h.n('bowlBtn').click();await h.n('readyBallBtn').click();const s=h.u.get(),surface=h.n('fieldCanvas');s.pending={...s.pending,archetype:'legspin',family:'wrist-spin',lengthName:'full',length:2.8,contactH:.32,line:0,swing:0,kick:.1,noBall:false,freeHit:false};const batter=s.match.batters[s.match.striker];batter.attributes={...batter.attributes,timing:1.15,matchups:{...batter.attributes.matchups,legspin:1.05}};
 const error=C.Contact.window(s.pending,batter,{mode:'defend'})-20;assert.ok(error>285);s.elapsed=s.pending.duration+error;h.u.clock(0);assert.equal(s.phase,'flight');h.u.pointerDown(pointer(surface,160,350));assert.ok(h.u.gesture());h.u.pointerUp(pointer(surface,160,326));assert.equal(s.shot.mode,'defend');assert.ok(Math.abs(s.shot.error-error)<1e-8);assert.equal(h.n('feedbackTitle').textContent,'Shot played');
 for(let i=1;i<=4;i++){h.advance(100);h.u.clock(i*100);}assert.equal(s.phase,'inPlay');assert.equal(s.live.contact,true);
});
await check('The running button cannot call a fourth run, including on an older resumed ball',async()=>{
 for(const version of [13,15,16]){const h=host();await h.n('resumeBtn').click();await h.n('bowlBtn').click();await h.n('readyBallBtn').click();const s=h.u.get();s.pending={...s.pending,scoringVersion:version,noBall:false,freeHit:false};let r;
  for(const angle of [44,132,-145,0]){r=C.Shot.resolve(s.pending,{angle,mode:'ground',effort:.45,error:0},s.match.batters[s.match.striker],C.Innings.field(s.match,s.pending),s.match.rngState);if(r.play.running)break;}assert.ok(r.play.running);
  r={...r,decisionTime:20,play:{...r.play,throw:{...r.play.throw,breakTime:20},running:{...r.play.running,legs:[],commands:[]}}};let time=0;for(let i=0;i<3;i++){r=C.Running.command(r,'run',time);time=r.play.running.legs.at(-1).start+.2;}assert.equal(r.play.running.legs.length,3);
  s.phase='inPlay';s.live={...r,batter:s.match.striker,nonStriker:s.match.nonStriker};s.resultAge=time*1000;h.u.renderUI();assert.equal(h.n('runningPanel').hidden,false);assert.equal(h.n('runBtn').disabled,true);assert.equal(h.n('runBtn').textContent,'Three-run limit');const before=JSON.stringify(s.live);await h.n('runBtn').dispatch('click');assert.equal(JSON.stringify(s.live),before);
 }
});
await check('Fullscreen rejection and browser exit leave usable settings and preserve the prepared delivery',async()=>{
 const h=host();await h.n('resumeBtn').click();await h.n('bowlBtn').click();const before=copy(h.u.get().pending);h.u.openDialog('settingsDialog');await h.u.chooseDisplay(true);await h.document.exitFullscreen();assert.equal(h.layers.at(-1),h.n('settingsDialog'));assert.equal(h.document.documentElement.dataset.view,'full');assert.equal(h.u.isPaused(),true);assert.deepEqual(copy(h.u.get().pending),before);
 h.failFullscreen();await h.u.chooseDisplay(true);assert.equal(h.layers.at(-1),h.n('settingsDialog'));assert.equal(h.document.documentElement.dataset.view,'full');assert.match(h.n('displayStatus').textContent,/unavailable/);await h.n('settingsResumeBtn').click();assert.equal(h.u.isPaused(),false);assert.equal(h.u.get().fieldBrief,true);
});
await check('Match display omits the toss and prepared notices contain short conditions with a separate wind indicator',async()=>{
 for(const format of ['T20','TEST']){const h=host(format);assert.doesNotMatch(h.n('matchLine').textContent,/toss|chose/);await h.n('resumeBtn').click();await h.n('bowlBtn').click();assert.ok(h.n('briefText').textContent.length<140);assert.ok(h.n('briefConditions').textContent.length<85);assert.doesNotMatch(h.n('briefConditions').textContent,/km\/h|°C/);assert.equal(Number(h.n('windValue').textContent)%5,0);assert.ok(h.n('windArrow').style.transform.startsWith('rotate('));assert.equal(h.n('deliveryBrief').parentElement.id,'playDock');assert.notEqual(h.n('runningPanel').closest('.arena')?.tag,'section');}
});
await check('Handed fullscreen cameras separate the bowler from the batter, mirror correctly and join the replay continuously',()=>{
 for(const [w,h]of [[320,480],[390,690],[430,810],[844,220]])for(const hand of ['right','left']){const view=C.View.forBatter(hand,true,w,h),sign=hand==='left'?-1:1,project=(x,z,y)=>C.View.project(x,z,y,view,w,h),head=project(-.47*sign,0,1.67),feet=project(-.47*sign,0,0);assert.ok(head.x>5&&head.x<w-5);assert.ok(feet.y<h&&feet.y>h*.5);
  for(const x of [-.6,.6]){const bowler=project(x,18.4,1.65),release=project(x,18.4,2.1);assert.ok(bowler.y<head.y-10||Math.abs(bowler.x-head.x)>head.unit*.17+bowler.unit*.16);assert.ok(release.x>0&&release.x<w&&release.y>0&&release.y<h);}
  assert.deepEqual(C.View.camera(null,0,0,view),view);const other=C.View.forBatter(hand==='left'?'right':'left',true,w,h);assert.equal(view.x,-other.x);assert.equal(view.tx,-other.tx);assert.equal(view.z,other.z);
 }
 const s=career(),d=C.Innings.delivery(s.match),r=C.Shot.resolve(d.ball,{angle:40,mode:'ground',effort:.7,error:0},s.match.batters[s.match.striker],C.Innings.field(s.match,d.ball),d.rngState),stance=C.View.forBatter('left',true,390,690);assert.ok(r.play);assert.deepEqual(C.View.camera(r.play,0,0,stance),stance);
});
await check('Layout and camera changes leave V13 deliveries, shot outcomes and save continuation unchanged',()=>{
 const box={};vm.createContext(box);vm.runInContext(core(cp.execFileSync('git',['show','6aaf3160597cc9a18340c0f8e1a4a50d15be9b5b:dist/index.html'],{cwd:__dirname,encoding:'utf8'})),box);const O=box.Cricket;
 for(const format of ['T20','TEST'])for(let seed=1;seed<=4;seed++){const m=O.Innings.create(seed,O.Squad.team(format,'eng'),O.Squad.team(format,'ind'),format,0),d=O.Innings.delivery(m);for(const shot of [null,{angle:130,mode:'ground',effort:.7,error:35}])assert.equal(JSON.stringify(C.Shot.resolve(d.ball,shot,m.batters[0],C.Innings.field(m,d.ball),d.rngState)),JSON.stringify(O.Shot.resolve(copy(d.ball),shot,copy(m.batters[0]),O.Innings.field(copy(m),copy(d.ball)),d.rngState)));}
});
await check('Batting and replay renderers run with finite coordinates and a separate radar drawing surface',async()=>{
 const h=host();await h.n('settingsBtn').click();await h.u.chooseDisplay(true);await h.n('settingsResumeBtn').click();await h.n('bowlBtn').click();await h.n('readyBallBtn').click();const s=h.u.get();h.u.drawField(0);s.elapsed=s.pending.duration*s.pending.bounceT+.01;h.u.drawField(1);s.elapsed=s.pending.duration-80;h.u.pointerDown(pointer(h.n('fieldCanvas'),160,350));h.advance(80);h.u.pointerUp(pointer(h.n('fieldCanvas'),230,300));for(let i=0;i<5;i++){h.advance(100);h.u.clock(180+i*100);}assert.equal(s.phase,'inPlay');s.resultAge=s.live.play.event.time*1000+100;h.u.drawField(2);assert.ok(h.n('radarCanvas').drawCalls>20);assert.ok(h.n('fieldCanvas').drawCalls>100);
});
console.log(checks+' display and input checks passed.');
})();
