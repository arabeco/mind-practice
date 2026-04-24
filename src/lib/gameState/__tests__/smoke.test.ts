import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

test('zod importa e parse basico funciona', () => {
  const schema = z.object({ n: z.number() });
  const r = schema.parse({ n: 42 });
  assert.equal(r.n, 42);
});
