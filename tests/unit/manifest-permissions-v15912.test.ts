import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

interface ManifestV3Shape {
  manifest_version: number;
  version: string;
  permissions?: readonly string[];
  optional_host_permissions?: readonly string[];
  content_security_policy?: { extension_pages?: string };
  web_accessible_resources?: readonly {
    resources?: readonly string[];
    matches?: readonly string[];
  }[];
}

function manifest(): ManifestV3Shape {
  return JSON.parse(
    readFileSync(join(process.cwd(), 'manifest.base.json'), 'utf8')
  ) as ManifestV3Shape;
}

describe('v15.9.12 manifest permissions and CSP contracts', () => {
  it('stays on Manifest V3 with the current release version', () => {
    const data = manifest();
    expect(data.manifest_version).toBe(3);
    expect(data.version).toBe('15.9.12');
  });

  it('keeps permissions restricted to the reviewed allowlist', () => {
    expect([...(manifest().permissions ?? [])].sort()).toEqual([
      'activeTab',
      'alarms',
      'scripting',
      'storage',
    ]);
  });

  it('keeps optional host permissions broad but explicit and user-granted', () => {
    expect(manifest().optional_host_permissions).toEqual(['http://*/*', 'https://*/*']);
  });

  it('does not allow unsafe inline or eval extension scripts', () => {
    const csp = manifest().content_security_policy?.extension_pages ?? '';
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('does not expose non-font resources through web_accessible_resources', () => {
    const resources = manifest().web_accessible_resources ?? [];
    expect(resources).toHaveLength(1);
    expect(resources[0]?.resources).toEqual(['fonts/*.woff2']);
    expect(resources[0]?.matches).toEqual(['http://*/*', 'https://*/*']);
  });
});
