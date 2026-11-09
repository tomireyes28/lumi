#!/usr/bin/env node
// Public deployment metadata only; no login, cookies or provider tokens.
const { execFileSync } = require('node:child_process');
const path = require('node:path');
const root = path.resolve(__dirname, '../..');
const github = 'https://api.github.com/repos/tomireyes28/lumi';
const headers = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'Lumi-release-preflight',
};
async function json(url) {
  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok)
    throw Object.assign(new Error('Public metadata request failed'), {
      code: `HTTP_${response.status}`,
    });
  return response.json();
}
async function main() {
  const revision =
    process.argv[2] ||
    execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
  if (!/^[a-f0-9]{40}$/i.test(revision))
    throw Object.assign(new Error('Expected full commit SHA'), {
      code: 'INVALID_REVISION',
    });
  const [checks, status, deployments] = await Promise.all([
    json(`${github}/commits/${revision}/check-runs`),
    json(`${github}/commits/${revision}/status`),
    json(`${github}/deployments?per_page=12`),
  ]);
  const matching = deployments.filter((d) => d.sha === revision);
  const latestByEnvironment = [
    ...new Map(
      matching
        .slice()
        .reverse()
        .map((d) => [d.environment, d]),
    ).values(),
  ];
  const published = await Promise.all(
    latestByEnvironment.map(async (d) => {
      const statuses = await json(d.statuses_url);
      return {
        environment: d.environment,
        revision: d.sha,
        state: statuses[0]?.state || 'pending',
        url: statuses[0]?.environment_url || null,
      };
    }),
  );
  const webUrl = process.env.LUMI_WEB_URL || 'https://lumi-beta-one.vercel.app';
  const web = await fetch(webUrl, { signal: AbortSignal.timeout(15000) });
  const html = await web.text();
  const assetUrls = [...html.matchAll(/src="([^"]+\.js[^"]*)"/g)]
    .map((match) => new URL(match[1], webUrl))
    .filter(
      (url) =>
        url.origin === new URL(webUrl).origin &&
        url.pathname.startsWith('/_next/'),
    );
  const apiOrigins = new Set();
  for (const url of assetUrls.slice(0, 30)) {
    const js = await (
      await fetch(url, { signal: AbortSignal.timeout(15000) })
    ).text();
    for (const match of js.matchAll(/https:\/\/[a-z0-9.-]+\.railway\.app/gi))
      apiOrigins.add(match[0]);
  }
  const apis = await Promise.all(
    [...apiOrigins].map(async (origin) => {
      const health = await fetch(`${origin}/health`, {
        signal: AbortSignal.timeout(15000),
      });
      return { origin, status: health.status, health: await health.json() };
    }),
  );
  console.log(
    JSON.stringify(
      {
        revision,
        checks: checks.check_runs.map((c) => ({
          name: c.name,
          status: c.status,
          conclusion: c.conclusion,
          url: c.details_url,
        })),
        providers: status.statuses.map((s) => ({
          name: s.context,
          state: s.state,
          url: s.target_url,
        })),
        deployments: published,
        frontend: {
          url: webUrl,
          status: web.status,
          revision: web.headers.get('x-lumi-revision'),
        },
        apis,
      },
      null,
      2,
    ),
  );
}
main().catch((error) => {
  console.error(
    JSON.stringify({
      error: 'Public release verification failed',
      code: error.code || error.cause?.code || error.name,
    }),
  );
  process.exitCode = 1;
});
