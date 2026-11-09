const {spawnSync}=require('node:child_process');
for(const TZ of ['UTC','America/Argentina/Buenos_Aires']){
  const result=spawnSync(process.execPath,[require.resolve('jest/bin/jest'),'--runInBand','--runTestsByPath','src/utils/date.util.spec.ts','src/notifications/notifications.service.spec.ts'],{env:{...process.env,TZ},stdio:'inherit'});
  if(result.status!==0){process.exitCode=result.status||1;break;}
}
