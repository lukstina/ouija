import test from 'node:test';
import assert from 'node:assert/strict';
import { getDemoReply } from './replies.js';
test('questions return deterministic local replies', () => {
  assert.equal(getDemoReply('Hello?'), getDemoReply(' hello? '));
  assert.match(getDemoReply('What comes next?'), /[a-z]+/i);
});
test('blank questions are rejected', () => {
  assert.throws(() => getDemoReply('  '), /enter a question/);
});
