const cp=require('node:child_process');
for(const file of ['check-player-profiles.cjs','check-over-flow.cjs','check-spin-drives.cjs','check-world-progression.cjs','check-fielding-balance.cjs','check-model-v23.cjs','check-boundaries.cjs','check-timing-offset.cjs']){
 const r=cp.spawnSync(process.execPath,[file],{cwd:__dirname,stdio:'inherit'});if(r.error)throw r.error;if(r.status!==0)process.exit(r.status||1);
}
console.log('All 52 portable review groups passed.');
