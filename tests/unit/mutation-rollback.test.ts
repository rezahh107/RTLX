import { beforeEach, describe, expect, it } from 'vitest';
import { installDom } from '../dom-test-setup';
import { createPlan } from '../../src/content/mutation-plan';
import { MutationJournal } from '../../src/content/mutation-journal';
import { applyMutationPlan } from '../../src/content/mutation-applier';
import { rollbackJournal } from '../../src/content/rollback-manager';
beforeEach(() =>
  installDom('<html><body><p id="x">متن https://example.com پایان</p></body></html>')
);
describe('mutation journal and rollback', () => {
  it('restores dir and wrapper text sequence', () => {
    const p = document.getElementById('x')!;
    const text = p.firstChild as Text;
    const source = text.data;
    const start = source.indexOf('https');
    const plan = createPlan([
      {
        type: 'add-attribute',
        sequence: 1,
        target: p,
        owner: 'RTLX-15.9.11',
        requirementId: 'DIRECTION-DECISION-001',
        name: 'dir',
        value: 'rtl',
        expectedCurrentValue: null,
      },
      {
        type: 'insert-bdi-wrapper',
        sequence: 2,
        target: text,
        owner: 'RTLX-15.9.11',
        requirementId: 'BIDI-MUTATION-001',
        token: {
          start,
          end: start + 'https://example.com'.length,
          type: 'url',
          priority: 3,
          direction: 'ltr',
        },
        expectedSourceText: source,
      },
    ]);
    const journal = new MutationJournal();
    expect(applyMutationPlan(plan, journal).committed).toBe(2);
    expect(p.querySelector('bdi')?.textContent).toBe('https://example.com');
    const result = rollbackJournal(journal);
    expect(result.failed).toBe(0);
    expect(p.hasAttribute('dir')).toBe(false);
    expect(p.textContent).toBe(source);
    expect(rollbackJournal(journal).restored).toBe(0);
  });
});

it('skips a wrapper when the source changed independently before commit', () => {
  const p = document.getElementById('x')!;
  const text = p.firstChild as Text;
  const source = text.data;
  const start = source.indexOf('https');
  const plan = createPlan([
    {
      type: 'insert-bdi-wrapper',
      sequence: 10,
      target: text,
      owner: 'RTLX-15.9.11',
      requirementId: 'BIDI-MUTATION-001',
      token: { start, end: start + 19, type: 'url', priority: 3, direction: 'ltr' },
      expectedSourceText: source,
    },
  ]);
  text.data = source.slice(0, -1);
  const journal = new MutationJournal();
  expect(applyMutationPlan(plan, journal)).toMatchObject({ committed: 0, skipped: 1 });
  expect(p.querySelector('bdi')).toBeNull();
});

it('retains unsafe journal entries instead of losing rollback ownership', () => {
  const p = document.getElementById('x')!;
  const plan = createPlan([
    {
      type: 'add-attribute',
      sequence: 20,
      target: p,
      owner: 'RTLX-15.9.11',
      requirementId: 'DIRECTION-DECISION-001',
      name: 'dir',
      value: 'rtl',
      expectedCurrentValue: null,
    },
  ]);
  const journal = new MutationJournal();
  applyMutationPlan(plan, journal);
  p.setAttribute('dir', 'ltr');
  const result = rollbackJournal(journal);
  expect(result.skipped).toBe(1);
  expect(journal.size()).toBe(1);
  expect(p.getAttribute('dir')).toBe('ltr');
});
