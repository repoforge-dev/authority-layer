const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function resolvePath(...segments) {
  return path.join(__dirname, '..', ...segments);
}

assert.equal(fs.existsSync(resolvePath('packages', 'core', 'src', 'index.ts')), true);
assert.equal(fs.existsSync(resolvePath('docs', 'enforcement.md')), true);
assert.equal(fs.existsSync(resolvePath('examples', 'run.js')), true);

const packageJson = JSON.parse(fs.readFileSync(resolvePath('package.json'), 'utf8'));

assert.equal(packageJson.homepage, 'https://repoforge.dev/repos/repoforge-dev/authority-layer');
assert.match(packageJson.repository.url, /repoforge-dev\/authority-layer/);

console.log('AuthorityLayer workspace smoke tests passed.');
