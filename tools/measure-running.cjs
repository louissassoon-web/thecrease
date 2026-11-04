// Manual bowling diagnostic: external policy RNG is separate from the match stream.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const file=process.argv[2]||path.join(__dirname,'../src/core.js'),box={};vm.createContext(box);vm.runInContext(fs.readFileSync(file,'utf8'),box);const C=box.Cricket;
const totals={innings:0,balls:0,runs:0,wickets:0,runOuts:0,quickChances:0,completedRuns:0};
for(let k=1;k<=40;k++){
 const teams=C.Squad.teams('T20'),a=teams[k%8],b=teams[(k+3)%8];let c=C.Contest.create(20261104+k*3571,'T20',a,b,'spectator'),policy=C.RNG.stream(7919*k+91);totals.innings++;
 while(c.phase==='play'&&c.innings.length===1){const m=C.Contest.current(c),owner=m.bowlers[C.Innings.bowler(m)],options=C.BowlingControl.options(owner),d=C.BowlingControl.prepare(m,{line:[-.12,.14,.35,.55][Math.floor(policy.next()*4)],variation:options[Math.floor(policy.next()*options.length)].name}),ball=C.BowlingControl.release(d.ball,760+policy.next()*320),bot=C.Opposition.input(m,ball,c);let r=C.Shot.resolve(ball,bot.shot,m.batters[m.striker],C.Innings.field(m,ball),bot.rngState),t=r.play.event.time+.22;
  if(C.ReturnControl.available(r,t)&&r.play.running.legs.some(l=>l.start<t&&t<l.end)){const choices=[0,1].map(end=>C.ReturnControl.choose(r,end,t));if(choices.some(x=>x.dismissalKind==='runOut'))totals.quickChances++;r=choices.sort((x,y)=>x.play.throw.breakTime-y.play.throw.breakTime)[0];}
  totals.balls++;totals.runs+=r.runs;totals.wickets+=r.wicket?1:0;totals.runOuts+=r.dismissalKind==='runOut'?1:0;totals.completedRuns+=r.completedRuns||0;c=C.Contest.apply(C.Contest.withPrepared(c,bot.rngState),ball,r);
 }
}
console.log(JSON.stringify({...totals,runsPerInnings:totals.runs/totals.innings,runOutsPerInnings:totals.runOuts/totals.innings,runOutSharePct:100*totals.runOuts/totals.wickets},null,2));
