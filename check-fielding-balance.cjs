// Regression checks for reported failures, using the real core and UI draw path.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {C,host,pointer,copy}=require('./check-display-input.cjs');
const box={};vm.createContext(box);vm.runInContext(fs.readFileSync(__dirname+'/review-fixtures/core-v20.js','utf8')+'\nglobalThis.old=Cricket;',box);const Old=box.old;
let checks=0;async function check(name,fn){try{await fn();console.log('PASS '+name);checks++;}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exit(1);}}
const input=(angle=44,error=0,mode='ground')=>({angle,error,mode,effort:.65});
function fixture(type='seam',seed=71){const m=C.Innings.create(seed,C.Squad.team('TEST','eng'),C.Squad.team('TEST','ind'),'TEST',0);const i=m.bowlers.findIndex(b=>b.archetype===type);if(i>=0)m.order.fill(i);return{m,...C.Innings.delivery(m)};}
function examples(){const {m,ball}=fixture(),found={};outer:for(let seed=1;seed<=100;seed++)for(const angle of [0,44,87,135,-95])for(const error of [0,120,180]){const shot={...input(angle,error),effort:.75},r=C.Shot.resolve(ball,shot,m.batters[0],C.Innings.field(m,ball),seed),e=r.play.event,key=e.type==='catch'&&(e.id==='keeper'||/slip/.test(e.name))?e.id==='keeper'?'keeper':'slip':e.type==='pickup'&&Math.hypot(e.x,e.z)>27?'deep':null;if(key&&!found[key])found[key]={m,ball,r,shot};if(Object.keys(found).length===3)break outer;}assert.equal(Object.keys(found).length,3);return found;}
const toAge=(p,t)=>C.Presentation.cordon(p)?(t<p.event.time?t/p.event.time*Math.max(1.05,p.event.time):Math.max(1.05,p.event.time)+t-p.event.time)*1000:t*1000;
const saved=h=>JSON.parse(h.storage.get('cricket.career.v5'));
(async()=>{
await check('Short outside-off diagonals become controlled cuts, with fewer forced edges and room for genuine mistakes',()=>{
 let before={miss:0,edge:0},after={miss:0,edge:0},n=0;
 const {m,ball}=fixture();for(const hand of ['right','left'])for(const x of [.22,.5,.85])for(const height of [1.40,1.65,1.85])for(const angle of [44,87,130])for(const error of [-230,-120,0,120,230])for(let seed=1;seed<=20;seed++){
  const sign=hand==='left'?-1:1,b={...ball,battingHand:hand,lengthName:'short',contactH:height,line:(x-.1)*sign,kick:.1*sign,releaseX:ball.releaseX*sign,swing:0},shot=input(angle,error);for(const [version,tally]of [[20,before],[22,after]]){const r=C.Contact.resolve({...C.Hand.canonical(b),scoringVersion:version},shot,m.batters[0],Math.imul(seed,0x9e3779b9)>>>0);tally.miss+=!r.contact;tally.edge+=!!r.edge;}
  assert.equal(C.Shot.describe(44*sign,'ground',b),'Square cut');assert.equal(C.Strokes.guide(b)[1].label,'CUT');n++;
 }
 assert.ok(after.edge/(n-after.miss)<before.edge/(n-before.miss)*.35);assert.ok(after.miss<before.miss*.25);assert.ok(after.edge>0);console.log('Short outside-off trials:',{n,before,after});
 const cramped={...ball,lengthName:'short',contactH:1.8,line:-.25,kick:0,swing:0};assert.ok(C.Shot.suitability(cramped,87,'ground').value<.7);assert.equal(C.Contact.cutCoverage(cramped,input(87)),false);assert.equal(C.Contact.cutCoverage({...cramped,line:.4},input(87,0,'loft')),false);
});
await check('Spin coverage improves at ordinary phone release offsets while precision, pace difficulty and power stay separate',()=>{
 let before={miss:0,edge:0},after={miss:0,edge:0},n=0;for(const type of ['offspin','legspin'])for(let seed=1;seed<=40;seed++){const {m,ball}=fixture(type,seed),x=C.Delivery.at(C.Hand.canonical(ball),1).x;if(Math.abs(x)>1.1||ball.lengthName==='short')continue;const angle=x<-.2?-44:x>.2?44:0;for(const error of [-500,-400,-250,0,250,400,500]){const shot=input(angle,error);for(const [version,tally]of [[20,before],[22,after]]){const r=C.Contact.resolve({...C.Hand.canonical(ball),scoringVersion:version},shot,m.batters[0],Math.imul(seed,0x9e3779b9)>>>0);tally.miss+=!r.contact;tally.edge+=!!r.edge;}n++;}
  const legacy={...ball,scoringVersion:22,kick:Math.tan(ball.kick)*5.5};assert.equal(C.Contact.precisionWindow(legacy,m.batters[0],input()),C.Contact.precisionWindow({...legacy,scoringVersion:20},m.batters[0],input()));
 }
 console.log('Spin release trials:',{n,before,after});assert.ok(after.miss<before.miss*.35);assert.ok(after.edge/(n-after.miss)<before.edge/(n-before.miss));
 const {m,ball:prepared}=fixture('offspin'),ball={...prepared,scoringVersion:22,kick:Math.tan(prepared.kick)*5.5};let weak=0;for(let seed=1;seed<=40;seed++){const b={...ball,lengthName:'full',contactH:.34,line:.10,kick:.18,swing:0},field=C.Innings.field(m,b),middle=C.Shot.resolve(b,input(),m.batters[0],field,Math.imul(seed,0x9e3779b9)>>>0),late=C.Shot.resolve(b,input(44,420),m.batters[0],field,Math.imul(seed,0x9e3779b9)>>>0);if(!middle.edge&&!late.edge){assert.ok(late.contact);assert.ok(late.exitSpeed<middle.exitSpeed*.85);assert.notEqual(late.boundary,6);weak++;}}assert.ok(weak>20);
 const pace=fixture('seam');pace.ball={...pace.ball,scoringVersion:22,kick:Math.tan(pace.ball.kick)*5.5};for(const mode of ['ground','loft','defend'])assert.equal(C.Contact.window(pace.ball,pace.m.batters[0],input(44,0,mode)),C.Contact.window({...pace.ball,scoringVersion:20},pace.m.batters[0],input(44,0,mode)));
});
const samples=examples();
await check('Actual rendering retains the ball through keeper/slip catches, gathering, release and the deep return',()=>{
 for(const [name,{m,ball,r,shot}]of Object.entries(samples))for(const full of [false,true]){const h=host('TEST'),s=h.u.get();h.document.documentElement.dataset.view=full?'full':'pad';Object.assign(s,{match:m,pending:ball,shot,live:r,phase:'inPlay',fieldBrief:false,elapsed:ball.duration+shot.error+35});
  const e=r.play.event,times=name==='deep'?[e.time-.02,e.time+.2,r.play.throw.release,(r.play.throw.release+r.play.throw.landing)/2,r.play.throw.breakTime]:[e.time-.02,e.time,e.time+.3,e.time+.8];
  for(const t of times){s.resultAge=toAge(r.play,t);h.u.takePaintedBalls();h.u.drawField(0);const balls=h.u.takePaintedBalls();assert.equal(balls.length,1,name+' rendered ball count');const expected=C.Fielding.ballAt(r.play,t);for(const key of ['x','z','h'])assert.ok(Math.abs(balls[0][key]-expected[key])<1e-7);}
 }
});
await check('Cordon playback shows the interception before returning to batting; catches and high returns fit the camera',()=>{
 for(const {r}of Object.values(samples)){const p=r.play,e=p.event;for(const [w,h]of [[390,400],[390,690]]){const camera=C.Presentation.fieldCamera(p,w,h),times=p.throw?Array.from({length:21},(_,i)=>p.throw.release+(p.throw.breakTime-p.throw.release)*i/20):[e.time-.08,e.time,e.time+.3,e.time+.8];for(const t of times){const b=C.Fielding.ballAt(p,t),q=C.View.project(b.x,b.z,b.h,camera,w,h);assert.ok(q.x>w*.05&&q.x<w*.95&&q.y>h*.05&&q.y<h*.95,'Ball outside camera');}}
  if(e.type==='catch'){assert.ok(Math.abs(C.Presentation.playback(p,1050)-e.time)<1e-8);assert.ok(C.Presentation.playback(p,800)<e.time);let last=-1;for(let age=0;age<=2200;age+=16){const t=C.Presentation.playback(p,age);assert.ok(t>last);last=t;}}
 }
});
await check('Catching hands hold the ball and fielders keep fixed limb lengths through gather, turn and throw',()=>{
 for(const {r,ball}of Object.values(samples)){const e=r.play.event;let previous=null;for(let t=Math.max(0,e.time-.4);t<e.time+1.3;t+=1/120){const frame=C.Fielding.frame(r,t,null,ball),f=frame.fielders.find(f=>f.id===e.id),p=C.FielderRig.pose(f,t);const points=[p.head,...p.wrists].map(v=>({x:v.x+f.x,y:v.y,z:v.z+f.z}));if(previous&&e.type==='catch')points.forEach((v,i)=>assert.ok(Math.hypot(v.x-previous[i].x,v.y-previous[i].y,v.z-previous[i].z)<.09,'Abrupt catch-pose jump'));previous=points;for(let i=0;i<2;i++){const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);assert.ok(Math.abs(distance(p.roots[i],p.elbows[i])-.31)<1e-6);assert.ok(Math.abs(distance(p.elbows[i],p.wrists[i])-.28)<1e-6);assert.ok(Math.abs(distance(p.hips[i],p.knees[i])-.45)<1e-6);assert.ok(Math.abs(distance(p.knees[i],p.ankles[i])-.43)<1e-6);}
   if(e.type==='catch'&&t>=e.time){const grip={x:(p.wrists[0].x+p.wrists[1].x)/2+f.x,z:(p.wrists[0].z+p.wrists[1].z)/2+f.z,h:(p.wrists[0].y+p.wrists[1].y)/2};assert.ok(Math.hypot(grip.x-frame.ball.x,grip.z-frame.ball.z,grip.h-frame.ball.h)<.035);}
  }
 }
});
await check('Shop access closes at match start and remains blocked through over and innings breaks, including stale buttons',async()=>{
 const base=saved(host('TEST'));base.wallet={...C.Economy.create(),coins:1800};const h=host('TEST',base);await h.n('shopBtn').click();const stale=h.n('kitShop').children[1].children.find(n=>n.tag==='button');assert.ok(stale);await h.n('shopDoneBtn').click();await h.n('bowlBtn').click();await h.n('menuBtn').click();assert.equal(h.n('shopBtn').hidden,true);const before=copy(saved(h).wallet);await h.n('shopBtn').dispatch('click');assert.equal(h.n('shopDialog').open,false);await stale.dispatch('click');assert.deepEqual(saved(h).wallet,before);
 const s=h.u.get();for(const phase of ['result','ready']){s.phase=phase;s.match.history.push({});assert.equal(h.u.shopAvailable(),false);}s.pending=null;s.phase='ready';s.match.history=[];s.contest.innings.push(copy(s.contest.innings[0]));assert.equal(h.u.shopAvailable(),false);s.contest.phase='complete';assert.equal(h.u.shopAvailable(),true);
});
await check('Saved V20 deliveries retain exact outcomes; new spin swipes work on both touch surfaces and resume identically',async()=>{
 for(const format of ['TEST','T20'])for(let seed=1;seed<=3;seed++){const m=Old.Innings.create(seed,Old.Squad.team(format,'eng'),Old.Squad.team(format,'ind'),format,0);for(const over of [0,1,10]){m.balls=over*6;const d=Old.Innings.delivery(m);for(const shot of [null,input(),input(87,160),input(-95,-180)])assert.equal(JSON.stringify(C.Shot.resolve(d.ball,shot,m.batters[0],C.Innings.field(m,d.ball),d.rngState)),JSON.stringify(Old.Shot.resolve(d.ball,shot,m.batters[0],Old.Innings.field(m,d.ball),d.rngState)));assert.equal(C.Innings.delivery(m).ball.scoringVersion,24);}}
 for(const full of [false,true]){const h=host('TEST');if(full){await h.n('settingsBtn').click();await h.u.chooseDisplay(true);await h.n('settingsResumeBtn').click();}else await h.n('resumeBtn').click();await h.n('bowlBtn').click();await h.n('readyBallBtn').click();const s=h.u.get(),{ball}=fixture('offspin'),x=C.Delivery.at(ball,1).x;s.pending={...ball,bowler:s.pending.bowler,line:ball.line-x+.18,contactH:.35,lengthName:'full'};s.elapsed=s.pending.duration+160;const pad=h.n(full?'fieldCanvas':'swipePad');h.u.pointerDown(pointer(pad,150,350));h.u.pointerUp(pointer(pad,210,278));assert.ok(s.shot);for(let i=0;i<5&&s.phase==='flight';i++)h.step();assert.equal(s.phase,'inPlay');assert.equal(s.live.contact,true);await h.n('menuBtn').click();const packed=saved(h);C.CareerSave.validate(copy(packed));const reload=host('TEST',packed);assert.deepEqual(copy(reload.u.get().live),copy(s.live));}
});
console.log(checks+' fielding, contact and shop regression groups passed.');
})();
