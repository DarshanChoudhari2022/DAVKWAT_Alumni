// @vitest-environment node
import { describe, expect, it } from 'vitest';

describe('camera permissions response header', () => {
  it('allows this website to request camera access', async () => {
    const configFile = '../next.config.mjs';
    const { default: config } = await import(configFile);
    const rules = await config.headers();
    const policy = rules[0].headers.find((header: { key: string }) => header.key === 'Permissions-Policy').value;
    expect(policy).toContain('camera=(self)');
    expect(policy).toContain('microphone=()');
  });
});
