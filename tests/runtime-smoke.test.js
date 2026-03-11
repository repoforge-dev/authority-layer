const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function resolvePath(...segments) {
  return path.join(__dirname, '..', ...segments);
}

assert.equal(fs.existsSync(resolvePath('docs', 'configuration.md')), true);
assert.equal(fs.existsSync(resolvePath('packages', 'core', 'src', 'enforcement', 'budgetGuard.ts')), true);
assert.equal(fs.existsSync(resolvePath('packages', 'core', 'src', 'enforcement', 'loopGuard.ts')), true);
assert.equal(fs.existsSync(resolvePath('packages', 'core', 'src', 'enforcement', 'toolThrottle.ts')), true);

const readme = fs.readFileSync(resolvePath('README.md'), 'utf8');

assert.match(readme, /runtime guardrails/i);
assert.match(readme, /reposcore/i);
assert.match(readme, /configuration/i);

console.log('AuthorityLayer runtime smoke tests passed.');
