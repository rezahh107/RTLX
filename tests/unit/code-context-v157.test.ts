import { beforeEach, describe, expect, it } from 'vitest';
import { classifyCodeContext } from '../../src/content/code-context';
import { planCodeZones } from '../../src/content/code-zone-planner';
import { installDom } from '../dom-test-setup';

describe('v15.7 code-context precision', () => {
  beforeEach(() => installDom());

  it('distinguishes block code, technical inline code, and Persian inline prose', () => {
    document.body.innerHTML = `
      <pre><code id="block">npm run build</code></pre>
      <p><code id="technical">config.json</code></p>
      <p><code id="persian">این مقدار فارسی است</code></p>`;
    expect(classifyCodeContext(document.querySelector('#block')!)).toBe('block-code');
    expect(classifyCodeContext(document.querySelector('#technical')!)).toBe('inline-technical');
    expect(classifyCodeContext(document.querySelector('#persian')!)).toBe('inline-natural-rtl');
  });

  it('keeps block code LTR but gives natural inline code automatic isolation', () => {
    document.body.innerHTML = `
      <pre><code id="block">const x = 1;</code></pre>
      <p><code id="persian">متن فارسی طبیعی</code></p>`;
    const plan = planCodeZones(document.body, 1, []);
    const attributes = plan.operations.filter((operation) => operation.type === 'add-attribute');
    expect(attributes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          target: document.querySelector('#block'),
          name: 'dir',
          value: 'ltr',
        }),
        expect.objectContaining({
          target: document.querySelector('#persian'),
          name: 'dir',
          value: 'auto',
        }),
      ])
    );
  });
});
