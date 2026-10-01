// Portable: Node built-ins only, with the actual game core and UI handlers.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {host,pointer,C,copy}=require('./check-display-input.cjs');
const old={};vm.createContext(old);vm.runInContext(fs.readFileSync(__dirname+'/review-fixtures/core-v18.js','utf8'),old);const O=old.Cricket;
let checks=0;async function check(name,fn){try{await fn();checks++;console.log('PASS '+name);}catch(e){console.error('FAIL '+name+'\n'+e.stack);process.exit(1);}}
function until(h,predicate,limit=2000){for(let i=0;i<limit;i++){if(predicate(h.u.get()))return;h.step();}throw Error('Game clock did not reach expected state');}
async function begin(){const h=host('TEST');await h.n('resumeBtn').click();await h.n('bowlBtn').click();until(h,s=>!s.fieldBrief);return h;}
function match(format='TEST',bat='eng',bowl='ind',seed=17){return C.Innings.create(seed,C.Squad.team(format,bat),C.Squad.team(format,bowl),format,0);}
function neutral(format='TEST'){const m=match(format),d=C.Innings.delivery(m);return{m,ball:{...d.ball,scoringVersion:19,archetype:'seam',family:'pace',arm:'right',battingHand:'right',lengthName:'full',length:2.8,line:.16,swing:0,kick:0,contactH:.32,noBall:false,freeHit:false,speed:135,preTime:15.6/37.5,postTime:2.8/(37.5*.79)},field:C.Innings.field(m,d.ball)};}
(async()=>{
await check('Every player has a stable named profile in both formats; roles are not inferred from batting position',()=>{
 const seen=new Set();let attacks=0;for(const f of ['TEST','T20'])for(const team of C.Squad.teams(f)){
  const m=match(f,team.id,team.id);for(let i=0;i<11;i++){const p=C.Players.batter(m,i);assert.ok(C.Players.valid(p,f),team.xi[i].name);assert.equal(p.id,team.xi[i].playerId);seen.add(p.id);}
  for(const b of team.attack){const p=C.Players.data[b.playerId].bowling;assert.ok(p,b.name);assert.ok(b.speed[0]<=b.speed[1]);assert.equal(b.arm,p.arm);attacks++;}
 }
 assert.equal(seen.size,145);assert.equal(attacks,80);
 const root=C.Players.batting('joe-root','TEST'),pope=C.Players.batting('ollie-pope','TEST'),smith=C.Players.batting('steve-smith','TEST'),david=C.Players.batting('tim-david','T20');assert.ok(root.timing>pope.timing);assert.ok(smith.defence>david.defence);assert.ok(david.power>root.power);assert.ok(C.Players.batting('steve-smith','TEST').timing>C.Players.batting('steve-smith','T20').timing);
});
await check('Named strengths change real timing windows, defence, spin match-ups and loft power',()=>{
 const {m,ball,field}=neutral(),b=m.batters[0],input={angle:44,mode:'ground',effort:.8,error:0},profile=id=>({...ball,batterProfile:C.Players.batting(id,'TEST')}),root=profile('joe-root'),tail=profile('shoaib-bashir');
 assert.ok(C.Contact.window(root,b,{...input,mode:'defend'})>C.Contact.window(tail,b,{...input,mode:'defend'})*1.35);
 const duck=profile('ben-duckett');duck.archetype='offspin';duck.family='finger-spin';assert.ok(C.Contact.window(duck,b,{...input,angle:-100})>C.Contact.window(duck,b,input));
 const dubePace={...ball,format:'T20',batterProfile:C.Players.batting('shivam-dube','T20')},dubeSpin={...dubePace,archetype:'offspin',family:'finger-spin'},david={...ball,batterProfile:C.Players.batting('tim-david','T20')};
 const paceMatch=C.Players.effective(dubePace,b,input).attributes.matchups.seam,spinMatch=C.Players.effective(dubeSpin,b,input).attributes.matchups.offspin;assert.ok(spinMatch>paceMatch);
 let rootSpeed=0,davidSpeed=0,n=0;for(let seed=1;seed<=24;seed++){const shot={...input,mode:'loft'},a=C.Shot.resolve(root,shot,b,field,seed),z=C.Shot.resolve(david,shot,b,field,seed);if(a.contact&&!a.edge&&z.contact&&!z.edge){rootSpeed+=a.exitSpeed;davidSpeed+=z.exitSpeed;n++;}}
 assert.ok(n>10);assert.ok(davidSpeed>rootSpeed*1.12);console.log('Matched clean lofts:',{samples:n,rootMeanExitSpeed:+(rootSpeed/n).toFixed(2),davidMeanExitSpeed:+(davidSpeed/n).toFixed(2)});
});
await check('Bowler speed, control and variations affect real deliveries, with integer speeds and a fixed style through the over',()=>{
 const styles=new Map();let bumrahWides=0,ranaWides=0,bumrahYorkers=0,ranaYorkers=0;
 for(const f of ['TEST','T20'])for(const team of C.Squad.teams(f)){const m=match(f,'eng',team.id);for(let i=0;i<m.bowlers.length;i++){m.order=Array(m.order.length).fill(i);for(let seed=1;seed<=8;seed++){m.rngState=seed*7471;const d=C.Innings.delivery(m),p=d.ball.bowlerProfile;assert.ok(C.Players.validBowler(p));assert.ok(Number.isInteger(d.ball.speed));assert.ok(d.ball.speed>=p.speed[0]-21&&d.ball.speed<=p.speed[1]+2);assert.ok(Number.isFinite(d.ball.duration)&&d.ball.duration>=800&&d.ball.duration<=4000);styles.set(p.id,d.ball.archetype);}}}
 assert.equal(styles.get('jofra-archer'),'seam');assert.equal(styles.get('kuldeep-yadav'),'legspin');assert.ok(C.Players.data['jofra-archer'].bowling.speed[0]>C.Players.data['joe-root'].bowling.speed[1]);
 const a=match('T20'),b=copy(a);a.balls=b.balls=108;a.order.fill(0);b.order.fill(1);
 for(let seed=1;seed<=500;seed++){a.rngState=b.rngState=seed*104729;const x=C.Innings.delivery(a).ball,z=C.Innings.delivery(b).ball;bumrahWides+=Math.abs(x.line)>1;ranaWides+=Math.abs(z.line)>1;bumrahYorkers+=x.lengthName==='yorker';ranaYorkers+=z.lengthName==='yorker';}
 assert.ok(bumrahWides<ranaWides);assert.ok(bumrahYorkers>ranaYorkers);console.log('500 death-over deliveries per bowler:',{bumrahWides,ranaWides,bumrahYorkers,ranaYorkers});
 const m=match('TEST','eng','eng');m.balls=1;m.history=[{over:0,delivery:{bowler:0,archetype:'swing'}}];assert.equal(C.Innings.delivery(m).ball.archetype,'swing');m.balls=6;m.order[1]=0;assert.equal(C.Innings.delivery(m).ball.archetype,'seam');
});
await check('V18 pending balls retain exact outcomes, while the next preparation adopts profiles deterministically',()=>{
 for(const f of ['TEST','T20'])for(let seed=1;seed<=4;seed++){const m=O.Innings.create(seed,O.Squad.team(f,'eng'),O.Squad.team(f,'ind'),f,0);for(const over of [0,1,11]){m.balls=over*6;const d=O.Innings.delivery(m);for(const input of [null,{angle:44,mode:'ground',effort:.7,error:90},{angle:-95,mode:'loft',effort:.8,error:50}])assert.equal(JSON.stringify(C.Shot.resolve(d.ball,input,m.batters[0],C.Innings.field(m,d.ball),d.rngState)),JSON.stringify(O.Shot.resolve(d.ball,input,m.batters[0],O.Innings.field(m,d.ball),d.rngState)));const before=JSON.stringify(m),a=C.Innings.delivery(m),b=C.Innings.delivery(copy(m));assert.equal(a.ball.scoringVersion,25);assert.deepEqual(a,b);assert.equal(JSON.stringify(m),before);}}
});
await check('Existing edited names retain their original player identity and incoming profiles contain no random variation',()=>{
 const m=O.Innings.create(71,O.Squad.team('TEST','eng'),O.Squad.team('TEST','ind'),'TEST',0),before=C.Players.batter(m,3);m.batters[3].name='Louis';assert.deepEqual(C.Players.batter(m,3),before);m.bowlers[0].name='My fast bowler';const d=C.Innings.delivery(m);assert.equal(d.ball.bowlerProfile.id,'jasprit-bumrah');const renamedTeam=C.Squad.team('TEST','eng');renamedTeam.xi[3].name='Louis';const n=C.Innings.create(71,renamedTeam,C.Squad.team('TEST','ind'),'TEST',0);assert.equal(C.Players.batter(n,3).id,'joe-root');
});
await check('The paused profile selector shows both teams, strengths and actual bowling data without advancing play',async()=>{
 const h=await begin(),s=h.u.get(),before=copy(s.pending),seed=s.match.rngState;await h.n('menuBtn').click();await h.n('playersBtn').click();assert.equal(h.u.isPaused(),true);assert.equal(h.n('profileBatting').children.length,9);h.n('profileTeam').value=String(s.contest.teams.findIndex(t=>t.id==='eng'));await h.n('profileTeam').dispatch('change');h.n('profilePlayer').value='3';await h.n('profilePlayer').dispatch('change');assert.equal(h.n('profileName').textContent,'Joe Root');assert.match(h.n('profileStrengths').textContent,/Timing|spin|Defence/);assert.match(h.n('profileWeaknesses').textContent,/Power/);assert.equal(h.n('profileBowlingSection').hidden,false);assert.equal(h.n('profileBowling').children.length,6);for(let i=0;i<20;i++)h.step();assert.equal(s.match.rngState,seed);assert.deepEqual(copy(s.pending),before);await h.n('profilesDoneBtn').click();assert.equal(h.u.isPaused(),false);
});
await check('Prepared profile snapshots survive save/resume and validation rejects broken ratings',async()=>{
 const h=await begin(),s=h.u.get();s.elapsed=s.pending.duration-60;h.u.pointerDown(pointer(h.n('swipePad'),150,350));h.advance(60);h.u.pointerUp(pointer(h.n('swipePad'),230,260));until(h,s=>s.phase==='inPlay');await h.n('menuBtn').click();const saved=JSON.parse(h.storage.get('cricket.career.v5')),valid=C.CareerSave.validate(copy(saved));assert.equal(valid.sessions.TEST.pending.scoringVersion,25);const resumed=host('TEST',saved);await h.n('resumeBtn').click();await resumed.n('resumeBtn').click();until(h,s=>s.phase==='result');until(resumed,s=>s.phase==='result');assert.deepEqual(copy(h.u.get().match),copy(resumed.u.get().match));
 const bad=copy(saved);bad.sessions.TEST.pending.batterProfile.power=999;assert.throws(()=>C.CareerSave.validate(bad),/player profile/);bad.sessions.TEST.pending.batterProfile.power=80;bad.sessions.TEST.pending.bowlerProfile.rating='high';assert.throws(()=>C.CareerSave.validate(bad),/player profile/);
});
await check('Exported ball details remain sufficient to reproduce an opposition shot including its profiles',()=>{
 for(const f of ['TEST','T20']){const c=C.Contest.create(917,f,C.Squad.team(f,'eng'),C.Squad.team(f,'ind'),'spectator'),r=C.Opposition.ball(c),t=r.testCase,actual=C.Shot.resolve(t.ball,t.input,t.batter,t.field,t.seed);assert.equal(actual.rngState,r.result.rngState);assert.equal(actual.runs,r.result.runs);assert.equal(actual.wicket,r.result.wicket);assert.equal(actual.exitSpeed,r.result.exitSpeed);assert.ok(C.Players.valid(t.ball.batterProfile,f));}
});
console.log(checks+' player-profile checks passed.');
})();
