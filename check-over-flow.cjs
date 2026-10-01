// Actual event handlers and clocks in the DOM facade; this is not browser QA.
const assert=require('node:assert/strict'),{host,pointer,C,copy}=require('./check-display-input.cjs');let checks=0;
async function check(name,fn){try{await fn();checks++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack.slice(0,2800));process.exit(1);}}
function until(h,predicate,limit=2200){for(let i=0;i<limit;i++){if(predicate(h.u.get()))return;h.step();}throw Error('Clock did not reach expected state');}
async function begin(format='TEST',full=false){const h=host(format);await h.n('resumeBtn').click();if(full){await h.n('settingsBtn').click();await h.u.chooseDisplay(true);await h.n('settingsResumeBtn').click();}await h.n('bowlBtn').click();return h;}
async function liveRunning(){const h=await begin();until(h,s=>s.phase==='flight'&&!s.fieldBrief);const s=h.u.get(),b=s.pending;let input;
 for(const effort of [.30,.40,.55,.65,.85]){for(const angle of [132,-145,44,-44,87,-95,0]){const shot={angle,mode:'ground',effort,error:0},r=C.Shot.resolve(b,shot,s.match.batters[s.match.striker],C.Innings.field(s.match,b),s.match.rngState);if(r.play.running&&r.play.throw?.breakTime>6.2&&r.play.running.legs.length){input=shot;break;}}if(input)break;}
 assert.ok(input,'Need a real gap and return');s.shot=input;until(h,s=>s.phase==='inPlay');return h;
}
(async()=>{
await check('Backswing loft works in both views, while direct swipes stay grounded without height buttons',async()=>{
 for(const full of [false,true])for(const loft of [false,true]){const h=await begin('TEST',full);assert.equal(h.n('readyBallBtn').hidden,true);until(h,s=>!s.fieldBrief);assert.equal(h.n('shotChoice').hidden,true);const s=h.u.get(),surface=h.n(full?'fieldCanvas':'swipePad');assert.equal(h.n('feedbackDetail').textContent,'');assert.equal(h.n('padLabel').textContent,'');s.elapsed=s.pending.duration-60;h.u.pointerDown(pointer(surface,150,420));if(loft)h.u.pointerMove(pointer(surface,134,444));h.advance(60);h.u.pointerUp(pointer(surface,260,255));assert.equal(s.shot.mode,loft?'loft':'ground');assert.equal(s.shot.error,0);assert.doesNotMatch(h.n('feedbackDetail').textContent,/swipe|hold your aim|lift your thumb/i);}
});
await check('One start plays six legal balls automatically, then stops between overs',async()=>{
 for(const format of ['TEST','T20']){const h=await begin(format);assert.equal(h.u.get().batUntil,6);assert.equal(h.n('actionCover').hidden,true);until(h,s=>s.match.balls===6&&s.phase==='result');assert.equal(h.u.get().match.history.filter(C.Rules.legal).length,6);const before=copy(h.u.get().match);for(let i=0;i<150;i++)h.step();assert.deepEqual(copy(h.u.get().match),before);assert.equal(h.n('actionCover').hidden,false);assert.equal(h.n('bowlBtn').textContent,'Start next over');await h.n('bowlBtn').click();assert.equal(h.u.get().batUntil,12);assert.equal(h.u.get().phase,'flight');}
});
await check('A no-ball is rebowled inside the active over without an extra start or a missing legal ball',async()=>{
 const h=await begin('T20');h.u.get().pending.noBall=true;until(h,s=>s.match.balls===6&&s.phase==='result');const history=h.u.get().match.history;assert.ok(history.length>6);assert.equal(history[0].noBall,true);assert.equal(history.filter(C.Rules.legal).length,6);assert.equal(h.u.get().match.balls,6);
});
await check('Fast-forward advances the shared replay clock fourfold and produces the same score, throw and RNG',async()=>{
 const normal=await liveRunning(),fast=await liveRunning(),a=normal.u.get(),b=fast.u.get(),path=JSON.stringify(b.live.play);assert.equal(JSON.stringify(a.live.play),path);assert.equal(fast.n('fastForwardBtn').hidden,false);await fast.n('fastForwardBtn').click();const age=a.resultAge;normal.step();fast.step();assert.equal(a.resultAge-age,100);assert.equal(b.resultAge-age,400);assert.equal(JSON.stringify(b.live.play),path);until(normal,s=>s.phase==='result');until(fast,s=>s.phase==='result');assert.equal(JSON.stringify(a.match),JSON.stringify(b.match));assert.equal(JSON.stringify(b.match.history.at(-1).play),path);
 const pending=b.pending;until(fast,s=>s.pending!==pending&&!s.fieldBrief);assert.equal(b.loftIntent,false);const elapsed=b.elapsed;fast.step();assert.equal(b.elapsed-elapsed,100);assert.equal(fast.n('fastForwardBtn').hidden,true);
});
await check('Calling a run or pausing restores normal playback speed and keeps the running decision live',async()=>{
 const h=await liveRunning(),s=h.u.get();for(let i=0;i<4;i++)h.step();assert.equal(h.n('runBtn').disabled,false);await h.n('fastForwardBtn').click();await h.n('runBtn').click();assert.equal(s.live.play.running.legs.length,2);const t=s.resultAge;h.step();assert.equal(s.resultAge-t,100);await h.n('fastForwardBtn').click();await h.n('menuBtn').click();const paused=copy(s);for(let i=0;i<20;i++)h.step();assert.deepEqual(copy(s),paused);await h.n('resumeBtn').click();const age=s.resultAge;for(let i=0;i<10;i++)h.step();assert.ok(s.resultAge-age<=100);assert.equal(h.n('fastForwardBtn').attrs['aria-pressed'],'false');
});
await check('Paused auto-over saves resume the same prepared ball and complete the over once',async()=>{
 const h=await begin();until(h,s=>s.match.balls>=2&&s.phase==='flight'&&!s.fieldBrief);await h.n('menuBtn').click();const saved=JSON.parse(h.storage.get('cricket.career.v5')),validated=C.CareerSave.validate(copy(saved)),r=host('TEST',saved);assert.equal(validated.sessions.TEST.batUntil,6);assert.deepEqual(copy(r.u.get().pending),copy(h.u.get().pending));await h.n('resumeBtn').click();await r.n('resumeBtn').click();until(h,s=>s.match.balls===6&&s.phase==='result');until(r,s=>s.match.balls===6&&s.phase==='result');assert.deepEqual(copy(h.u.get().match),copy(r.u.get().match));const bad=copy(saved);bad.sessions.TEST.batUntil=7;assert.throws(()=>C.CareerSave.validate(bad),/over controls/);bad.sessions.TEST.batUntil=6;bad.sessions.TEST.loftIntent='yes';assert.throws(()=>C.CareerSave.validate(bad),/over controls/);
});
await check('An innings interval stops the automatic sequence even when the over has balls remaining',async()=>{
 const h=await begin();until(h,s=>s.match.balls>=1&&s.phase==='result');const s=h.u.get();s.contest.phase='interval';s.match.complete=true;s.match.endReason='all out';h.u.renderUI();const seed=s.match.rngState,pending=s.pending,balls=s.match.balls;for(let i=0;i<250;i++)h.step();assert.equal(s.pending,pending);assert.equal(s.match.rngState,seed);assert.equal(s.match.balls,balls);assert.equal(h.n('actionCover').hidden,false);assert.equal(h.n('bowlBtn').textContent,'Next innings');
});
console.log(checks+' automatic-over and replay checks passed.');
})();
