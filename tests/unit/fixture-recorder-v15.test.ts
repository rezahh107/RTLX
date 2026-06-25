import { describe, expect, it } from 'vitest';
import { recordFixtureSummary } from '../../src/content/fixture-recorder';
import { installDom } from '../dom-test-setup';

describe('Text-free fixture recorder v15', () => {
  it('records structural counts without page text or selectors', () => {
    const document = installDom(`
      <html><body>
        <main class="rtlx-owned-candidate" dir="rtl"><bdi class="rtlx-owned-bdi">API</bdi></main>
        <pre><code dir="ltr">npm test</code></pre><math></math><div contenteditable="true"></div>
      </body></html>`);
    const summary = recordFixtureSummary(document, null);
    expect(summary.textIncluded).toBe(false);
    expect(summary.counts).toMatchObject({ ownedCandidates: 1, ownedWrappers: 1, rtlElements: 1 });
    expect(JSON.stringify(summary)).not.toContain('npm test');
    expect(JSON.stringify(summary)).not.toContain('main');
  });
});
