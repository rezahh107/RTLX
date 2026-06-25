import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Official profile certification index v15', () => {
  it('enumerates all bundled profiles without claiming live verification', async () => {
    const index = JSON.parse(await readFile('profiles/bundled/index.json', 'utf8')) as {
      profiles: string[];
    };
    const certification = JSON.parse(
      await readFile('profiles/certification/index.json', 'utf8')
    ) as {
      records: Array<{
        profileId: string;
        liveStatus: string;
        chrome: string;
        edge: string;
        firefox: string;
      }>;
    };
    expect(certification.records).toHaveLength(index.profiles.length);
    expect(certification.records.every((record) => record.liveStatus === 'not-run')).toBe(true);
    expect(
      certification.records.every(
        (record) =>
          record.chrome === 'not-run' && record.edge === 'not-run' && record.firefox === 'not-run'
      )
    ).toBe(true);
  });
});
