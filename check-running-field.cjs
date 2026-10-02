// V12: player running choices, captain's field plans, saves and V11 compatibility.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),cp=require('node:child_process');
const html=fs.readFileSync(__dirname+'/dist/index.html','utf8'),script=s=>s.match(/<script id="cricket-core">([\s\S]*?)<\/script>/)[1],copy=x=>JSON.parse(JSON.stringify(x));
vm.runInThisContext(script(html));const C=Cricket,{Innings,Squad,Running,Tactics,Fielding,Shot,Contest,CareerSave}=C;
const fixtureBox={};vm.createContext(fixtureBox);vm.runInContext(script(cp.execFileSync('git',['show','af85cae34b0b20123ed8702255112995b0a8c07a:dist/index.html'],{cwd:__dirname,encoding:'utf8'})),fixtureBox);const FixtureV12=fixtureBox.Cricket;
let checks=0;function check(name,fn){try{fn();}catch(e){console.error('FAIL '+name+'\n'+e.stack.slice(0,2000));process.exit(1);}checks++;console.log('PASS '+name);}
function match(format='T20'){return Innings.create(17,Squad.team(format,'eng'),Squad.team(format,'ind'),format,0);}
function scenario(seed=1,angle=94,effort=.8,changes={}){const m={...match(),balls:60,rngState:seed*713},d=FixtureV12.Innings.delivery(m),ball={...d.ball,noBall:false,freeHit:false,battingHand:'right',line:angle<0?-.16:.25,swing:0,kick:0,length:5.4,lengthName:'good',contactH:.75,...changes};ball.preTime=(18.4-ball.length)/(ball.speed/3.6);ball.postTime=ball.length/(ball.speed/3.6*.79);ball.duration=(ball.preTime+ball.postTime)*2600;ball.bounceT=ball.preTime/(ball.preTime+ball.postTime);const input={angle,effort,mode:'ground',error:0},field=Innings.field(m,ball),r=Shot.resolve(ball,input,m.batters[0],field,d.rngState);return{m,ball,input,field,seed:d.rngState,r};}
function record(m,angle,runs=4,changes={}){const b=Innings.delivery(m).ball,r=C.Rules.score({rulesVersion:10,contact:true,edge:false,contactGrade:'MIDDLED',angle,quality:.9,rngState:m.rngState,title:'Runs',detail:'Field scenario',timing:'Good timing',play:{event:{type:runs===4?'four':'pickup',time:4}},...changes},runs);return Innings.apply(m,b,r);}
function history(m,angle,runs=4,changes={}){return Array.from({length:4},()=>({batter:m.striker,contact:true,edge:false,contactGrade:'MIDDLED',angle,batRuns:runs,runs,boundary:runs===4?4:0,delivery:{battingHand:'right'},...changes}));}
function stateFor(c){return{league:C.Season.create(c.seed,c.format,c.playerId),contest:c,match:Contest.current(c),phase:'ready',pending:null,live:null,shot:null,botInput:null,elapsed:0,resultAge:0,watchUntil:0,recorded:false};}
function restore(s){return CareerSave.validate(copy(CareerSave.pack({schema:5,active:s.contest.format,sessions:{[s.contest.format]:s}}))).sessions[s.contest.format];}
check('First single leaves safe twos and threes for the player without changing the ball or throw',()=>{
 const {r}=scenario(),path=copy(r.play.segments),route=copy(r.play.throw);assert.equal(r.completedRuns,1);assert.equal(r.play.running.legs.length,1);assert.equal(r.wicket,false);
 const offer=Running.offer(r,.77);assert.equal(offer.number,2);assert.equal(offer.status,'available');const two=Running.command(r,'run',.77);assert.equal(two.completedRuns,2);assert.equal(two.wicket,false);assert.equal(r.play.running.legs.length,1);
 const time=two.play.running.legs[1].start+.45,three=Running.command(two,'run',time);assert.equal(three.completedRuns,3);assert.equal(three.wicket,false);assert.deepEqual(three.play.segments,path);assert.deepEqual(three.play.throw,route);
 const end=Innings.apply({...scenario().m,balls:60},scenario().ball,three);assert.equal(end.runs,3);assert.equal(end.wickets,0);assert.equal(end.batters[0].runs,3);
});
check('Duplicate and late taps are blocked; cancelling a queued run holds safely; tight calls retain risk',()=>{
 const {r}=scenario(),two=Running.command(r,'run',.77);assert.equal(Running.offer(two,.79).status,'queued');assert.equal(Running.command(two,'run',.79),two);assert.equal(Running.offer(two,.79).canHold,true);
 const held=Running.command(two,'hold',1);assert.equal(held.completedRuns,1);assert.equal(held.wicket,false);assert.equal(Running.offer(held,1).canHold,false);assert.equal(held.play.running.legs[0].end,r.play.running.legs[0].end);
 const late=scenario(1,-145,.35).r;assert.equal(Running.offer(late,.77).status,'late');assert.equal(Running.command(late,'run',.77),late);
 const tight=scenario(10,0,.8).r;assert.equal(Running.offer(tight,.77).status,'tight');const risk=Running.command(tight,'run',.77);assert.equal(risk.dismissalKind,'runOut');assert.equal(risk.completedRuns,1);assert.equal(Running.frame(risk,risk.decisionTime)[risk.runOutRunner].grounded,false);assert.equal(Running.command(risk,'hold',1).wicket,false);
 for(const target of [1,2]){const {r}=scenario(1,94,.8,{runsNeeded:target}),done=target===1?r:Running.command(r,'run',.77);assert.equal(done.completedRuns,target);assert.equal(Running.offer(done,4).allowed,false);assert.equal(Running.command(done,'run',4),done);}
});
check('Opposition running uses the same safe offers and reproduces from saved intent',()=>{
 const s=scenario(),input={...s.input,callRuns:true,pushRun:false},a=Shot.resolve(s.ball,input,s.m.batters[0],s.field,s.seed),b=Shot.resolve(copy(s.ball),copy(input),copy(s.m.batters[0]),copy(s.field),s.seed);assert.ok(a.completedRuns>=3);assert.equal(a.wicket,false);assert.deepEqual(a,b);assert.deepEqual(a.play.running.commands,[]);
 const bot=C.Opposition.input(s.m,s.ball);if(bot.shot)assert.equal(bot.shot.callRuns,true);
 const risk=scenario(10,0,.8),cautious=Shot.resolve(risk.ball,{...risk.input,callRuns:true},risk.m.batters[0],risk.field,risk.seed);assert.equal(cautious.wicket,false);assert.equal(cautious.completedRuns,1);
});
check('Live running calls and the chosen field resume and replay exactly',()=>{
 let c=C.Season.begin(C.Season.create(19,'T20','eng')),s=stateFor(c);const d=Innings.delivery(s.match);s.pending={...d.ball,noBall:false,freeHit:false};s.contest=Contest.withPrepared(c,d.rngState);s.match=Contest.current(s.contest);
 let input,r;for(const angle of [-145,-90,-42,0,42,94,132]){input={angle,mode:'ground',effort:.55,error:0};r=Shot.resolve(s.pending,input,s.match.batters[s.match.striker],Innings.field(s.match,s.pending),s.match.rngState);if(r.play.running?.legs.length)break;}assert.ok(r.play.running?.legs.length);
 r=Running.command(r,'hold',.05);r=Running.command(r,'run',.4);s.shot=input;s.live={...r,batter:s.match.striker,nonStriker:s.match.nonStriker,over:0,ball:1};s.phase='inPlay';s.elapsed=d.ball.duration+20;s.resultAge=600;
 const restored=restore(s);assert.deepEqual(restored.live,copy(s.live));assert.deepEqual(Innings.field(restored.match,restored.pending),Innings.field(s.match,s.pending));assert.equal(restored.match.runs,0);
 let replay=Shot.resolve(restored.pending,restored.shot,restored.match.batters[restored.match.striker],Innings.field(restored.match,restored.pending),restored.match.rngState);for(const command of restored.live.play.running.commands)replay=Running.command(replay,command.kind,command.time);assert.deepEqual(copy(replay),copy(r));
 for(const a of [s,restored]){a.contest=Contest.apply(a.contest,a.pending,a.live);a.match=Contest.current(a.contest);a.live=null;a.phase='result';a.resultAge=20000;}assert.deepEqual(copy(s.match),copy(restored.match));assert.deepEqual(Innings.delivery(s.match),Innings.delivery(restore(restored).match));
 const bad=copy(s);bad.pending.savedField[0].r=2;assert.throws(()=>restore(bad),/saved field/);
});
check('Captain covers repeated boundaries and singles for the striker while ignoring edges and old patterns',()=>{
 const m=match('TEST'),base=Tactics.plan(m,null);assert.equal(base.adapted,0);const cover=Tactics.plan({...m,history:history(m,42)},null);assert.ok(cover.adapted>0);assert.match(cover.note,/cover boundary protected/);assert.ok(cover.field.some(f=>f.n==='deep cover'&&f.r*64===58));assert.deepEqual(cover.field.find(f=>f.n==='first slip'),base.field.find(f=>f.n==='first slip'));
 const singles=Tactics.plan({...m,history:history(m,94,1)},null);assert.match(singles.note,/point single closed down/);assert.ok(singles.field.some(f=>f.n==='point'&&f.r*64===20));
 for(const changes of [{edge:true},{contact:false},{batter:m.nonStriker},{contactGrade:'EDGE'}])assert.equal(Tactics.plan({...m,history:history(m,42,4,changes)},null).adapted,0);
 const old=history(m,42),quiet=Array.from({length:18},()=>({batter:m.striker,contact:true,batRuns:0,runs:0}));assert.equal(Tactics.plan({...m,history:[...old,...quiet]},null).adapted,0);
 let scored=m;scored=record(scored,42);scored=record(scored,42);assert.match(Innings.delivery(scored).ball.fieldNote,/cover boundary protected/);
});
check('Adapted pace and spin fields obey powerplay and leg-side limits and mirror for left-handers',()=>{
 let plans=0;for(const format of ['T20','TEST'])for(const balls of [0,36,96])for(const family of ['swing','seam','wrist-spin','finger-spin'])for(const angle of [-165,-104,-65,-2,42,94,144]){
  const m={...match(format),balls},h=history(m,angle),right=Tactics.plan({...m,history:h},{family,battingHand:'right'}),left=Tactics.plan({...m,history:h.map(r=>({...r,angle:-r.angle,delivery:{battingHand:'left'}}))},{family,battingHand:'left'});
  assert.equal(Tactics.legal(right.field,m),true);assert.deepEqual(left.field,right.field.map(f=>({...f,a:-f.a})));assert.equal(right.field.length,9);const points=Fielding.positions(right.field);assert.ok(points.every(p=>Math.abs(p.x)>1.53||p.z<-.8||p.z>19.3168));assert.ok(points.filter(p=>p.x<0&&p.z<C.Rules.crease[0]).length<=2);
  if(format==='T20'){assert.ok(right.field.filter(f=>Tactics.outside(f)).length<=(balls<36?2:5));assert.ok(right.field.filter(f=>f.a<0).length<=5);}plans++;
 }console.log({legalFieldPlans:plans});
});
check('A prepared delivery fixes the actual field; a same-striker free hit retains those positions',()=>{
 let m=match();m=record(m,42);const d=Innings.delivery(m),field=Innings.field(m,d.ball),changed={...m,history:history(m,-65)};assert.deepEqual(Innings.field(changed,d.ball),field);const exposed=Innings.field(m,d.ball);exposed[0].r=.9;assert.deepEqual(Innings.field(m,d.ball),field);
 const r=Shot.resolve(d.ball,{angle:42,mode:'ground',effort:.5,error:30},m.batters[m.striker],field,d.rngState),starts=Fielding.positions(field);for(const f of starts){const actual=r.play.starts.find(s=>s.id===f.id);assert.equal(actual.x,f.x);assert.equal(actual.z,f.z);}
 m=record(m,42,4,{noBall:true});assert.equal(m.freeHit,true);const free=Innings.delivery(m).ball;assert.match(free.fieldNote,/held for the free hit/);assert.deepEqual(free.savedField,m.history.at(-1).delivery.savedField);
 const cleared={...m,freeHit:false};assert.match(Innings.delivery(cleared).ball.fieldNote,/cover boundary protected/);
});
check('Pending V11 deliveries and running commands retain their exact outcomes and scorecards',()=>{
 const box={};vm.createContext(box);vm.runInContext(script(cp.execFileSync('git',['show','f4ad283522663494090295278500e70dd531fbf7:dist/index.html'],{cwd:__dirname,encoding:'utf8'})),box);const O=box.Cricket;
 for(const format of ['TEST','T20'])for(let seed=1;seed<=8;seed++){const m=O.Innings.create(seed,O.Squad.team(format,'eng'),O.Squad.team(format,'ind'),format,0),d=O.Innings.delivery(m),field=O.Innings.field(m,d.ball);assert.deepEqual(copy(Innings.field(copy(m),copy(d.ball))),copy(field));assert.deepEqual(copy(C.Opposition.input(copy(m),copy(d.ball))),copy(O.Opposition.input(m,d.ball)));
  for(const input of [null,{angle:42,mode:'ground',effort:.8,error:40},{angle:132,mode:'ground',effort:.55,error:0}]){let expected=O.Shot.resolve(d.ball,input,m.batters[m.striker],field,d.rngState),actual=Shot.resolve(copy(d.ball),input,copy(m.batters[m.striker]),copy(field),d.rngState);assert.equal(JSON.stringify(actual),JSON.stringify(expected));for(const [kind,time]of [['hold',.05],['run',.7],['run',.9]]){expected=O.Running.command(expected,kind,time);actual=Running.command(actual,kind,time);assert.equal(JSON.stringify(actual),JSON.stringify(expected));}assert.equal(JSON.stringify(Innings.apply(copy(m),copy(d.ball),actual)),JSON.stringify(O.Innings.apply(m,d.ball,expected)));}
 }
});
check('Running panel exposes the current offer and disables queued or late calls',()=>{
 const ui=html.match(/<script id="cricket-ui">([\s\S]*?)<\/script>/)[1],body=ui.match(/ function renderRunning\(\)\{([\s\S]*?)\n function /)[1],nodes=new Map(),$=id=>{if(!nodes.has(id))nodes.set(id,{});return nodes.get(id);};let r=scenario().r,time=.77;
 const render=new Function('state','lastResult','bowling','playback','Running','$','function renderRunning(){'+body+';return renderRunning;')({phase:'inPlay'},()=>r,()=>false,()=>time,Running,$);render();assert.equal($('runBtn').textContent,'Run 2');assert.equal($('runBtn').disabled,false);r=Running.command(r,'run',time);render();assert.equal($('runBtn').disabled,true);assert.equal($('holdBtn').disabled,false);r=scenario(1,-145,.35).r;render();assert.equal($('runBtn').disabled,true);assert.match($('runningHint').textContent,/Too late/);
 for(const block of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(block[1]);assert.match(ui,/await navigator\.share\(\{title:.*url:GAME_URL/);assert.match(ui,/await copyText\(GAME_URL\)/);assert.match(html,/Anyone with the testing link can play/);
});
console.log(checks+' running and field checks passed.');
