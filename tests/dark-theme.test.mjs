import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build, night, OUTPUT } from '../scripts/dark-theme.mjs';

test('the generated night stylesheet matches the current stylesheets', () => {
  assert.equal(readFileSync(OUTPUT, 'utf8').replace(/\r\n/g, '\n'), build(), 'run `npm run theme:dark` after changing colors in a workspace stylesheet');
});

test('night colors: dark text lightens, light surfaces darken, brand fills and images stay', () => {
  assert.equal(night('#fff', 'surface'), '#1a1a1a');
  assert.ok(parseInt(night('#2e2016', 'text').slice(1, 3), 16) > 200, 'dark ink becomes light');
  assert.equal(night('#7b4c30', 'surface'), null, 'brand fill stays');
  assert.equal(night('#fff7ea', 'text'), null, 'light text stays');
  assert.equal(night("var(--paper) url('/images/white-felt.webp')", 'surface'), null, 'image paths are not colors');
});
