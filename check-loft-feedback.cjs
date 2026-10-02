// Regression coverage for imperfect thumb paths and the actual input/result UI.
// The DOM facade does not render CSS or emulate a physical Android device.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),cp=require('node:child_process');
const {host,pointer,C,copy}=require('./check-display-input.cjs');
let checks=0;
async function check(name,fn){try{await fn();checks++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exit(1);}}
function until(h,predicate,limit=1500){for(let i=0;i<limit;i++){if(predicate(h.u.get()))return;h.step();}throw Error('Clock did not reach expected state');}
async function begin(full=false){const h=host('TEST');await h.n('resumeBtn').click();if(full){await h.n('settingsBtn').click();await h.u.chooseDisplay(true);await h.n('settingsResumeBtn').click();}await h.n('bowlBtn').click();until(h,s=>!s.fieldBrief);return h;}
const events=[{kind:'four',label:'Four'},{kind:'hundred',value:100,label:'Joe Root 100'},{kind:'team',value:200,label:'England 200'}];
(async()=>{
await check('Large pull-backs and diagonal reversals arm loft before crossing the starting point',()=>{
 for(const width of [320,390,600])for(const pull of [24,60,90,120])for(let angle=-180;angle<180;angle+=30)for(const offset of [-50,0,50]){
  const a=angle*Math.PI/180,b=(angle+offset)*Math.PI/180,ux=Math.sin(a),uy=-Math.cos(a),vx=Math.sin(b),vy=-Math.cos(b),px=200-ux*pull,py=250-uy*pull;
  let g=C.Gesture.begin(1,200,250,width,18);g=C.Gesture.move(g,1,px,py);
  const travel=Math.max(34,pull*.65);g=C.Gesture.move(g,1,px+vx*travel,py+vy*travel);
  assert.equal(g.mode,'loft',JSON.stringify({width,pull,angle,offset}));assert.equal(g.backswing,true);
  g=C.Gesture.move(g,1,px+vx*140,py+vy*140);const shot=C.Gesture.release(g,1,g.x,g.y,2300,2300,17);
  assert.equal(shot.mode,'loft');assert.ok(Math.abs(Math.sin((shot.angle-angle-offset)*Math.PI/180))<1e-8);assert.equal(shot.error,0);
 }
});
await check('Direct strokes, small corrections and ordinary curved swipes remain grounded; taps defend',()=>{
 for(const points of [[[0,0],[0,80],[0,200]],[[0,0],[30,-50],[75,-85],[125,-95]],[[0,0],[40,0],[31,4],[120,0]],[[0,0],[0,140],[0,115],[0,180]],[[0,0],[-8,8],[100,-100]]]){
  let g=C.Gesture.begin(1,...points[0],390,18);for(const point of points.slice(1))g=C.Gesture.move(g,1,...point);assert.equal(g.mode,'ground');
 }
 let g=C.Gesture.begin(1,150,400,390,18);g=C.Gesture.move(g,1,150,379);assert.equal(g.mode,'defend');assert.equal(C.Gesture.move(g,2,150,500),g);
});
await check('Separate and bundled touch events produce identical loft direction, effort and release timing on both surfaces',async()=>{
 const shots=[];
 for(const full of [false,true])for(const batching of ['separate','move','release']){
  const h=await begin(full),s=h.u.get(),surface=h.n(full?'fieldCanvas':'swipePad'),seed=s.match.rngState;s.elapsed=s.pending.duration-50;
  h.u.pointerDown(pointer(surface,150,320));const samples=[[150,400],[185,365],[260,280]].map(p=>pointer(surface,...p));
  if(batching==='separate'){for(const sample of samples)h.u.pointerMove(sample);}
  if(batching==='move')h.u.pointerMove(pointer(surface,260,280,{getCoalescedEvents:()=>samples}));
  if(batching!=='release'){assert.equal(h.u.gesture().backswing,true);assert.equal(h.n('shotIntent').textContent,'LOFT READY');}
  h.advance(50);h.u.pointerUp(pointer(h.document.body,260,280,batching==='release'?{getCoalescedEvents:()=>samples}:{}));
  assert.equal(s.shot.mode,'loft');assert.equal(s.shot.error,0);assert.equal(s.match.rngState,seed);assert.equal(surface.hasPointerCapture(4),false);assert.equal(h.u.gesture(),null);shots.push(copy(s.shot));
 }
 for(const shot of shots)assert.deepEqual(shot,shots[0]);
});
await check('Loft readiness latches early, guided shots are labelled honestly and cancellation resets the gesture',async()=>{
 const h=await begin(),s=h.u.get(),surface=h.n('swipePad');s.elapsed=s.pending.duration-70;
 h.u.pointerDown(pointer(surface,150,320));h.u.pointerMove(pointer(surface,150,410));h.u.pointerMove(pointer(surface,185,373));
 assert.equal(h.n('shotIntent').textContent,'LOFT READY');assert.equal(h.u.gesture().mode,'loft');assert.ok(h.u.gesture().y>h.u.gesture().sy);
 h.u.pointerMove(pointer(surface,270,510));assert.equal(h.u.gesture().backswing,true);assert.equal(h.n('shotIntent').textContent,'GUIDED · ALONG THE GROUND');assert.equal(h.n('shotIntent').dataset.loft,'false');
 h.u.pointerCancel(pointer(surface,270,510));assert.equal(h.u.gesture(),null);assert.equal(s.shot,null);assert.equal(h.u.isPaused(),true);assert.equal(h.n('shotIntent').dataset.loft,'false');
});
await check('A recognised full drive reaches the aerial shot model without changing the existing ball physics',()=>{
 const old={};vm.createContext(old);vm.runInContext(cp.execFileSync('git',['show','67d10819331002f6d1ae8b04b68c70af20d89805:dist/index.html'],{cwd:__dirname,encoding:'utf8'}).match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1],old);const O=old.Cricket;
 let g=C.Gesture.begin(1,150,320,390,18);g=C.Gesture.move(g,1,150,410);g=C.Gesture.move(g,1,270,270);const input=C.Gesture.release(g,1,g.x,g.y,2000,2000,17);let aerial=0;
 for(const format of ['TEST','T20'])for(let seed=1;seed<=6;seed++){
  const m=O.Innings.create(seed,O.Squad.team(format,'eng'),O.Squad.team(format,'ind'),format,0);
  for(const over of [0,11]){m.balls=over*6;const d=O.Innings.delivery(m);assert.equal(JSON.stringify(C.Innings.delivery(copy(m))),JSON.stringify(d));
   for(const shot of [null,input,{angle:132,mode:'ground',effort:.65,error:90}]){const n=C.Shot.resolve(d.ball,shot,m.batters[0],C.Innings.field(m,d.ball),d.rngState),o=O.Shot.resolve(d.ball,shot,m.batters[0],O.Innings.field(m,d.ball),d.rngState);assert.equal(JSON.stringify(n),JSON.stringify(o));if(shot===input&&d.ball.lengthName==='full'&&n.contact&&!n.edge){assert.equal(n.loft,true);assert.ok(n.play.initial.vy>0);aerial++;}}
  }
 }
 assert.ok(aerial>0,'Expected at least one clean, full-length lofted drive');
});
await check('Every boundary and milestone has a large numeral, clear caption and a longer real-time hold',()=>{
 const kinds=[['four',null,'4','FOUR'],['six',null,'6','SIX'],['fifty',50,'50','HALF-CENTURY'],['hundred',100,'100','CENTURY'],['onefifty',150,'150','150 RUNS'],['double',200,'200','DOUBLE CENTURY'],['team',100,'100','TEAM TOTAL'],['team',200,'200','TEAM TOTAL'],['team',300,'300','TEAM TOTAL']];
 for(const [kind,value,numeral,caption]of kinds){const r={presentationVersion:18,celebrations:[{kind,value,label:'Named achievement'}]},e=C.Presentation.sequence(r)[0];assert.equal(e.numeral,numeral);assert.equal(e.caption,caption);assert.ok(e.duration>=(value?3500:2800));assert.equal(C.Presentation.celebration(r,449),null);assert.equal(C.Presentation.celebration(r,900).alpha,1);assert.equal(C.Presentation.celebration(r,C.Presentation.duration(r)),null);}
 const r={presentationVersion:18,celebrations:events},queue=C.Presentation.sequence(r);assert.equal(queue.length,3);for(let i=1;i<queue.length;i++)assert.equal(queue[i].start,queue[i-1].start+queue[i-1].duration);assert.equal(C.Presentation.duration(r),10250);assert.equal(C.Presentation.duration({presentationVersion:18}),0);
 const old={celebrations:events};assert.equal(C.Presentation.duration(old),7100);assert.equal(C.Presentation.celebration(old,1900).kind,'hundred');
});
await check('Confirmed celebrations appear over the field, queue before the next ball and retain their position after saving',async()=>{
 for(const full of [false,true]){
  const h=await begin(full),s=h.u.get();until(h,s=>s.phase==='result');const r=s.match.history.at(-1);assert.equal(r.presentationVersion,18);r.celebrations=copy(events);s.celebrationAge=0;s.betweenAge=0;const ball=s.pending;h.u.renderUI();assert.equal(h.n('celebration').hidden,true);
  for(let i=0;i<9;i++)h.step();assert.equal(h.n('celebration').hidden,false);assert.equal(h.n('celebrationValue').textContent,'4');assert.equal(h.n('celebrationTitle').textContent,'FOUR');assert.equal(h.n('celebration').style.opacity,'1');assert.equal(h.n('celebration').parentElement.id,'fieldArena');assert.equal(h.n('menuBtn').closest('#fieldArena'),null);
  for(let i=0;i<26;i++)h.step();assert.equal(h.n('celebrationValue').textContent,'100');assert.equal(h.n('celebrationTitle').textContent,'CENTURY');assert.equal(h.n('celebrationDetail').textContent,'Joe Root 100');assert.equal(s.pending,ball);
  await h.n('menuBtn').click();const saved=JSON.parse(h.storage.get('cricket.career.v5'));assert.equal(C.CareerSave.validate(copy(saved)).sessions.TEST.celebrationAge,3500);const age=s.celebrationAge;for(let i=0;i<20;i++)h.step();assert.equal(s.celebrationAge,age);
  const resumed=host('TEST',saved),b=resumed.u.get().pending;await resumed.n('resumeBtn').click();assert.equal(resumed.n('celebrationTitle').textContent,'CENTURY');assert.equal(resumed.n('celebrationValue').textContent,'100');
  until(resumed,s=>s.celebrationAge>=7000);assert.equal(resumed.n('celebrationValue').textContent,'200');assert.equal(resumed.n('celebrationTitle').textContent,'TEAM TOTAL');assert.equal(resumed.u.get().pending,b);
  until(resumed,s=>s.pending!==b);assert.equal(resumed.n('celebration').hidden,true);assert.equal(resumed.n('fieldArena').dataset.celebrating,'false');
 }
});
await check('Reduced-motion cards stay static and the overlay cannot intercept batting or buttons',async()=>{
 const h=await begin();until(h,s=>s.phase==='result');const s=h.u.get();s.match.history.at(-1).celebrations=copy(events);s.celebrationAge=550;s.betweenAge=0;
 await h.n('settingsBtn').click();h.n('reducedMotionToggle').checked=true;await h.n('reducedMotionToggle').dispatch('change');await h.n('settingsResumeBtn').click();h.u.renderCelebration();assert.equal(h.n('celebration').style.opacity,'1');assert.equal(h.document.documentElement.dataset.motion,'reduced');
 const html=fs.readFileSync(__dirname+'/dist/index.html','utf8'),rule=html.match(/\.celebration\{([^}]+)\}/)[1];assert.match(rule,/pointer-events:none/);assert.doesNotMatch(rule,/animation|transition/);assert.match(rule,/background:var\(--dark\)/);assert.doesNotMatch(html,/data-celebrating='true'\]>.feedback\{visibility:hidden/);
});
console.log(checks+' loft and result-feedback checks passed.');
})();
