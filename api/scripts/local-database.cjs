const assert = require('node:assert/strict');
function localDatabase(value, pattern = /^\/lumi_test_[a-z0-9_]+$/) {
  assert.ok(
    value,
    'Provide an explicit disposable database URL; .env is never a fallback',
  );
  const url = new URL(value);
  assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
  assert.ok(
    ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname),
    'Only loopback databases are allowed',
  );
  assert.equal(
    url.search,
    '',
    'Connection options cannot override the validated host',
  );
  assert.match(url.pathname, pattern);
  return url;
}
module.exports = { localDatabase };
