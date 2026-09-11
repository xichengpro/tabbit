import { appendFileSync, readFileSync } from 'node:fs';

const manifestPath = process.argv[2] ?? '.output/chrome-mv3/manifest.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const expectedPermissions = ['alarms', 'sidePanel', 'storage'].sort();
const expectedOptionalPermissions = ['tabGroups', 'tabs'].sort();
const expectedHostPermissions = [];
const expectedContentMatches = ['http://*/*', 'https://*/*'].sort();
const actualPermissions = [...(manifest.permissions ?? [])].sort();
const actualOptionalPermissions = [...(manifest.optional_permissions ?? [])].sort();
const actualHostPermissions = [...(manifest.host_permissions ?? [])].sort();
const actualContentMatches = [...new Set(
  (manifest.content_scripts ?? []).flatMap((contentScript) => contentScript.matches ?? [])
)].sort();

function compare(actual, approved) {
  return {
    missing: approved.filter((value) => !actual.includes(value)),
    unexpected: actual.filter((value) => !approved.includes(value))
  };
}

function describeDiff(diff) {
  return diff.missing.length === 0 && diff.unexpected.length === 0
    ? '(clean)'
    : `missing=[${diff.missing.join(', ')}] unexpected=[${diff.unexpected.join(', ')}]`;
}

const permissionDiff = compare(actualPermissions, expectedPermissions);
const optionalPermissionDiff = compare(actualOptionalPermissions, expectedOptionalPermissions);
const hostPermissionDiff = compare(actualHostPermissions, expectedHostPermissions);
const contentMatchDiff = compare(actualContentMatches, expectedContentMatches);
const clean = [permissionDiff, optionalPermissionDiff, hostPermissionDiff, contentMatchDiff]
  .every((diff) => diff.missing.length === 0 && diff.unexpected.length === 0);

console.log(`Manifest: ${manifestPath}`);
console.log(`Permissions: ${actualPermissions.join(', ') || '(none)'}`);
console.log(`Permission diff: ${describeDiff(permissionDiff)}`);
console.log(`Optional permissions: ${actualOptionalPermissions.join(', ') || '(none)'}`);
console.log(`Optional permission diff: ${describeDiff(optionalPermissionDiff)}`);
console.log(`Host permissions: ${actualHostPermissions.join(', ') || '(none)'}`);
console.log(`Host permission diff: ${describeDiff(hostPermissionDiff)}`);
console.log(`Content-script matches: ${actualContentMatches.join(', ') || '(none)'}`);
console.log(`Content-script match diff: ${describeDiff(contentMatchDiff)}`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const summary = [
    '## Manifest access-scope review',
    '',
    `- Manifest: \`${manifestPath}\``,
    `- Permissions: \`${actualPermissions.join('`, `') || '(none)'}\``,
    `- Permission diff: ${describeDiff(permissionDiff)}`,
    `- Optional permissions: \`${actualOptionalPermissions.join('`, `') || '(none)'}\``,
    `- Optional permission diff: ${describeDiff(optionalPermissionDiff)}`,
    `- Host permissions: \`${actualHostPermissions.join('`, `') || '(none)'}\``,
    `- Host permission diff: ${describeDiff(hostPermissionDiff)}`,
    `- Content-script matches: \`${actualContentMatches.join('`, `') || '(none)'}\``,
    `- Content-script match diff: ${describeDiff(contentMatchDiff)}`,
    ''
  ].join('\n');
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}

if (!clean) {
  console.error('Manifest access scope differs from the approved set.');
  process.exit(1);
}
