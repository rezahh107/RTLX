import { describe, expect, it } from 'vitest';
import { parseStrictJson, StrictJsonError } from '../../src/shared/strict-json';
describe('strict JSON', () => {
  it('rejects duplicate object keys', () =>
    expect(() => parseStrictJson('{"a":1,"a":2}')).toThrow(StrictJsonError));
  it('rejects trailing data', () => expect(() => parseStrictJson('{} x')).toThrow());
  it('parses valid nested JSON', () =>
    expect(parseStrictJson('{"a":[1,true,null]}')).toEqual({ a: [1, true, null] }));
});

import { canonicalize } from '../../src/shared/canonical-json';

describe('RFC8785 I-JSON input', () => {
  it('rejects lone surrogate code units', () => {
    expect(() => canonicalize('\ud800')).toThrow('lone surrogate');
  });
});
