import { readFileSync } from 'node:fs';
import { beforeEach } from 'vitest';
import { describe, expect, it } from 'vitest';
import { evaluateProfileHealth } from '../../src/content/profile-health';
import type { SiteProfile } from '../../src/shared/types';
import { installDom } from '../dom-test-setup';

beforeEach(() => installDom());

describe('v15.9.11 ChatGPT profile narrowing', () => {
  it('narrows the first ChatGPT code rule away from every inline code element', () => {
    const profile = JSON.parse(readFileSync('profiles/bundled/chatgpt.json', 'utf8')) as SiteProfile;
    const codeRule = profile.rules.find(
      (rule) => rule.category === 'code' && rule.selector === 'pre code'
    );
    expect(profile.profileVersion).toBe(4);
    expect(codeRule).toMatchObject({ category: 'code', selector: 'pre code' });
    expect(profile.selectors.code).toEqual(['pre', 'pre code']);
  });

  it('does not mark ChatGPT unhealthy on pages with many inline code chips', () => {
    const profile = JSON.parse(readFileSync('profiles/bundled/chatgpt.json', 'utf8')) as SiteProfile;
    const main = document.createElement('main');
    main.setAttribute('data-message-author-role', 'assistant');
    for (let index = 0; index < 350; index += 1) {
      const paragraph = document.createElement('p');
      const code = document.createElement('code');
      code.textContent = `token-${index}`;
      paragraph.append('متن فارسی ', code);
      main.append(paragraph);
    }
    document.body.append(main);

    const report = evaluateProfileHealth(document, profile);
    const preCodeRule = report.rules.find(
      (rule) => rule.category === 'code' && rule.selector === 'pre code'
    );
    expect(report.status).toBe('healthy');
    expect(preCodeRule).toMatchObject({
      matchCount: 0,
      status: 'no-match',
    });
  });
});
