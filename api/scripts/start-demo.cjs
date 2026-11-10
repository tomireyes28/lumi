const { spawn } = require('node:child_process'),
  path = require('node:path'),
  crypto = require('node:crypto');
const { demoUrl } = require('./seed-demo.cjs');
demoUrl();
const api = path.resolve(__dirname, '..'),
  web = path.resolve(api, '../web');
const shared = crypto.randomBytes(48).toString('base64url');
const environment = {
  ...process.env,
  LUMI_PROXY_SECRET: shared,
  JWT_SECRET: crypto.randomBytes(48).toString('base64url'),
  RESEND_API_KEY: '',
  RESEND_FROM_EMAIL: '',
};
const apiChild = spawn(
  process.execPath,
  [path.join(__dirname, 'demo-server.cjs')],
  { cwd: api, env: environment, stdio: 'inherit', windowsHide: true },
);
const webChild = spawn(
  process.execPath,
  [
    path.join(web, 'node_modules/next/dist/bin/next'),
    'start',
    '-p',
    '3201',
    '--hostname',
    'localhost',
  ],
  {
    cwd: web,
    env: {
      ...environment,
      NODE_ENV: 'production',
      API_URL: 'http://127.0.0.1:3200',
      NEXT_PUBLIC_SITE_URL: 'http://localhost:3201',
    },
    stdio: 'inherit',
    windowsHide: true,
  },
);
console.log(
  'Demo local: http://localhost:3201 · datos sintéticos · correo y Google desactivados',
);
let stopping = false;
function stop() {
  if (stopping) return;
  stopping = true;
  apiChild.kill();
  webChild.kill();
}
for (const child of [apiChild, webChild]) {
  child.on('error', () => {
    stop();
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    if (code && !stopping) process.exitCode = code;
    stop();
  });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
