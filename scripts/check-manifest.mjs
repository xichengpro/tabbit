import { appendFileSync, readFileSync } from 'node:fs';

const manifestPath = process.argv[2] ?? '.output/chrome-mv3/manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const expectedPermissions = ['alarms', 'sidePanel', 'storage'];
const actualPermissions = [...(manifest.permissions ?? [])].sort();
const expected = [...expectedPermissions].sort();
const missing = expected.filter((permission) => !actualPermissions.includes(permission));
const unexpected = actualPermissions.filter((permission) => !expected.includes(permission));

console.log(`Manifest: ${manifestPath}`);
console.log(`Permissions: ${actualPermissions.length > 0 ? actualPermissions.join(', ') : '(none)'}`);
console.log(`Expected: ${expected.join(', ')}`);
console.log(`Permission diff: ${missing.length === 0 && unexpected.length === 0 ? '(clean)' : `missing=[${missing.join(', ')}] unexpected=[${unexpected.join(', ')}]`}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = [
    '## Manifest permission review',
    '',
    `- Manifest: \`${manifestPath}\``,
    `- Actual permissions: \`${actualPermissions.join('`, `') || '(none)'}\``,
    `- Expected permissions: \`${expected.join('`, ')}\``,
    `- Diff: ${missing.length === 0 && unexpected.length === 0 ? 'clean' : `missing=${missing.join(', ') || '(none)'}, unexpected=${unexpected.join(', ') || '(none)'}`}`,
    ''
  ].join('\n');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}

if (missing.length > 0 || unexpected.length > 0) {
  console.error('Manifest permissions differ from the approved MVP set.');
  process.exit(1);
}
