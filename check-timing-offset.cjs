// Exercise calibration through the real pointer, clock, feedback and save handlers.
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {C,host,pointer,copy}=require('./check-display-input.cjs');
const packed=h=>JSON.parse(h.storage.get('cricket.career.v5'));
let checks=0,offeredSave;
async function check(name,fn){await fn();console.log('PASS '+name);checks++;}
async function ready(h){
 for(let i=0;i<1800;i++){
  const s=h.u.get();if(s.phase==='flight'&&!s.fieldBrief&&!s.shot)return s;
  assert.equal(h.n('timingOffer').hidden,true,'Answer the timing offer before the next ball');
  assert.equal(s.match.complete,false,'Fixture must stay in its own innings');
  if(!h.n('actionCover').hidden&&!h.n('bowlBtn').disabled&&['ready','result'].includes(s.phase))await h.n('bowlBtn').click();
  h.step();
 }throw Error('No delivery reached the batter');
}
async function swing(h,raw){
 const s=await ready(h),n=s.match.history.length,surface=h.n('fieldCanvas'),seed=s.match.rngState,writes=h.writes();
 s.elapsed=s.pending.duration+raw;h.u.pointerDown(pointer(surface,160,350));h.u.pointerUp(pointer(surface,160,326));
 assert.equal(s.shot.rawError,raw);assert.equal(s.shot.mode,'defend');assert.equal(s.match.rngState,seed);assert.equal(h.writes(),writes,'Release must not write the career');
 const shot=copy(s.shot);h.u.drawField(0);
 for(let i=0;i<900&&h.u.get().match.history.length===n;i++)h.step();
 const result=h.u.get().match.history.at(-1);assert.equal(result.rawError,raw);assert.equal(result.error,shot.error);
 return shot;
}
(async()=>{
await check('Twenty human touch swings offer calibration; Apply centres raw -110 ms timing and aligns the bat without advancing RNG',async()=>{
 const h=host('TEST');await h.n('resumeBtn').click();
 while(h.u.get().match.balls<20){await swing(h,-110);if(h.u.get().match.balls<20)assert.equal(h.n('timingOffer').hidden,true);}
 assert.equal(h.n('timingOffer').hidden,false);assert.match(h.n('timingOfferText').textContent,/110 ms early.*110 ms timing offset/);
 offeredSave=packed(h);assert.equal(offeredSave.timingOffset,0);assert.equal(offeredSave.sessions.TEST.timingLearning.offered,true);
 const before=JSON.stringify(h.u.get().contest);await h.n('applyTimingBtn').click();assert.equal(packed(h).timingOffset,-110);assert.equal(JSON.stringify(h.u.get().contest),before);assert.equal(h.n('timingOffer').hidden,true);
 const corrected=[];for(const raw of [-120,-110,-100,-120,-110,-100,-120,-110,-100])corrected.push((await swing(h,raw)).error);
 assert.equal(corrected.reduce((a,b)=>a+b,0),0);assert.ok(corrected.every(e=>Math.abs(e)<=10));
 const s=await ready(h),surface=h.n('fieldCanvas');s.elapsed=s.pending.duration-110;h.u.pointerDown(pointer(surface,160,350));h.u.pointerUp(pointer(surface,160,326));assert.equal(s.shot.error,0);assert.equal(h.n('quality').textContent,'0 ms · on time');
 s.elapsed=s.pending.duration+C.BatterRig.settle(s.shot.error);assert.equal(C.BallView.strokeAge(s.pending,s.shot,s.elapsed),0);
 const strokeAge=C.BallView.strokeAge,seen=[];C.BallView.strokeAge=(b,shot,...args)=>{seen.push(copy(shot));return strokeAge(b,shot,...args);};try{h.u.drawField(0);}finally{C.BallView.strokeAge=strokeAge;}assert.equal(seen.at(-1).error,0);assert.equal(seen.at(-1).rawError,-110);
 while(h.u.get().phase==='flight'||h.u.get().phase==='inPlay')h.step();
 await h.n('settingsBtn').click();await h.n('timingResetBtn').click();await h.n('settingsResumeBtn').click();
 while(h.u.get().match.balls<40)await swing(h,-110);
 assert.equal(h.n('timingOffer').hidden,true,'Never offer twice in an innings');assert.equal(packed(h).timingErrors.length,40);assert.equal(packed(h).timingOffset,0);
 const restored=host('TEST',packed(h));assert.equal(restored.u.get().timingLearning.offered,true);assert.equal(restored.n('timingOffer').hidden,true);
});
await check('Not now persists; paused settings clamp to ±200 ms and reset without changing the prepared match',async()=>{
 const h=host('TEST',copy(offeredSave));await h.n('resumeBtn').click();await h.n('dismissTimingBtn').click();assert.equal(packed(h).timingOffset,0);assert.equal(packed(h).sessions.TEST.timingLearning.proposal,null);
 const restored=host('TEST',packed(h));assert.equal(restored.n('timingOffer').hidden,true);assert.equal(restored.u.get().timingLearning.offered,true);
 await h.n('settingsBtn').click();const before=JSON.stringify(h.u.get().contest);
 for(let i=0;i<20;i++)await h.n('timingMinusBtn').click();assert.equal(packed(h).timingOffset,-200);assert.equal(h.n('timingMinusBtn').disabled,true);assert.equal(h.n('timingOffsetValue').textContent,'-200 ms');
 for(let i=0;i<40;i++)await h.n('timingPlusBtn').click();assert.equal(packed(h).timingOffset,200);assert.equal(h.n('timingPlusBtn').disabled,true);assert.equal(h.n('timingOffsetValue').textContent,'+200 ms');
 await h.n('timingResetBtn').click();assert.equal(packed(h).timingOffset,0);assert.equal(JSON.stringify(h.u.get().contest),before);
 const short=host('TEST');await short.n('resumeBtn').click();await swing(short,-114);await short.n('menuBtn').click();await short.n('declareBtn').click();await short.n('confirmDeclareBtn').click();
 assert.equal(short.n('timingOffer').hidden,false);assert.equal(packed(short).sessions.TEST.timingLearning.proposal,-110);assert.equal(packed(short).timingOffset,0,'End-of-innings offer also needs explicit Apply');
});
await check('Revision 25 saves with no offset keep their prepared ball and history; malformed calibration data is rejected',()=>{
 const box={};vm.createContext(box);vm.runInContext(fs.readFileSync(__dirname+'/review-fixtures/core-v25.js','utf8')+';globalThis.old=Cricket;',box);const O=box.old;
 let league,contest;for(let seed=1;seed<100;seed++){league=O.Season.create(seed,'TEST','eng');contest=O.Season.begin(league);if(O.Contest.ownTurn(contest))break;}
 for(let i=0;i<5;i++){const m=O.Contest.current(contest),d=O.Innings.delivery(m),r=O.Shot.resolve(d.ball,{angle:0,mode:'defend',effort:0,error:-110},m.batters[m.striker],O.Innings.field(m,d.ball),d.rngState);contest=O.Contest.apply(O.Contest.withPrepared(contest,d.rngState),d.ball,r);}
 const m=O.Contest.current(contest),d=O.Innings.delivery(m);contest=O.Contest.withPrepared(contest,d.rngState);
 const state={league,contest,match:O.Contest.current(contest),recorded:false,...O.Restart.view(),phase:'flight',pending:d.ball,elapsed:0},old=copy(O.CareerSave.pack({active:'TEST',sessions:{TEST:state}}));assert.equal(old.timingOffset,undefined);
 const loaded=C.CareerSave.validate(copy(old));assert.equal(loaded.timingOffset,0);assert.deepEqual(copy(loaded.sessions.TEST.contest),old.sessions.TEST.contest);assert.deepEqual(copy(loaded.sessions.TEST.pending),old.sessions.TEST.pending);assert.deepEqual(copy(loaded.timingErrors),[-110,-110,-110,-110,-110]);
 const h=host('TEST',old);assert.equal(h.u.get().pending.scoringVersion,25);assert.deepEqual(copy(h.u.get().pending),old.sessions.TEST.pending);
 for(const patch of [{timingOffset:201},{timingOffset:'-110'},{timingErrors:Array(41).fill(0)},{timingErrors:[null]}])assert.throws(()=>C.CareerSave.validate({...copy(old),...patch}));
});
await check('Human calibration leaves watched AI shots, history and match RNG identical',async()=>{
 let league,contest;for(let seed=1;seed<100;seed++){league=C.Season.create(seed,'T20','eng');contest=C.Season.begin(league);if(!C.Contest.ownTurn(contest))break;}
 const state={league,contest,match:C.Contest.current(contest),recorded:false,...C.Restart.view()},base=C.CareerSave.pack({active:'T20',sessions:{T20:state}}),out=[];
 for(const offset of [0,-110]){const h=host('T20',{...copy(base),timingOffset:offset});await h.n('resumeBtn').click();await h.n('bowlBtn').click();for(let i=0;i<1500&&!h.u.get().match.history.length;i++)h.step();assert.ok(h.u.get().match.history.length);assert.equal(h.u.get().match.history[0].rawError,undefined);assert.equal(packed(h).timingErrors.length,0);out.push(copy(h.u.get().contest));}
 assert.deepEqual(out[0],out[1]);
});
console.log(checks+' timing-offset review groups passed.');
})().catch(e=>{console.error(e);process.exit(1);});
