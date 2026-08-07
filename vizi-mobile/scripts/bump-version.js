#!/usr/bin/env node
// Bumps the app version in app.json.
//
//   node scripts/bump-version.js build   -> 1.2.3 (4) -> 1.2.3 (5)
//   node scripts/bump-version.js patch   -> 1.2.3 (4) -> 1.2.4 (5)
//   node scripts/bump-version.js minor   -> 1.2.3 (4) -> 1.3.0 (5)
//   node scripts/bump-version.js major   -> 1.2.3 (4) -> 2.0.0 (5)
//
// The build number always increments — App Store Connect rejects a reused
// build number for the same version, and a new marketing version still needs
// a fresh build number in practice.

const fs = require('fs');
const path = require('path');

const KINDS = new Set(['build', 'patch', 'minor', 'major']);
const kind = process.argv[2] ?? 'build';

if (!KINDS.has(kind)) {
  console.error(`Unknown bump "${kind}". Use: ${[...KINDS].join(' | ')}`);
  process.exit(1);
}

const appJsonPath = path.join(__dirname, '..', 'app.json');
const raw = fs.readFileSync(appJsonPath, 'utf8');
const config = JSON.parse(raw);
const expo = config.expo;

const [major, minor, patch] = String(expo.version).split('.').map(Number);
if ([major, minor, patch].some(Number.isNaN)) {
  console.error(`app.json version "${expo.version}" is not semver (x.y.z)`);
  process.exit(1);
}

const nextVersion = {
  build: `${major}.${minor}.${patch}`,
  patch: `${major}.${minor}.${patch + 1}`,
  minor: `${major}.${minor + 1}.0`,
  major: `${major + 1}.0.0`,
}[kind];

const currentBuild = Number(expo.ios?.buildNumber ?? 0);
const nextBuild = String((Number.isNaN(currentBuild) ? 0 : currentBuild) + 1);

expo.version = nextVersion;
expo.ios = { ...expo.ios, buildNumber: nextBuild };
// Keep Android in step so the two platforms never drift.
expo.android = { ...expo.android, versionCode: Number(nextBuild) };

fs.writeFileSync(appJsonPath, `${JSON.stringify(config, null, 2)}\n`);

// Consumed by the release script.
console.log(`${nextVersion} ${nextBuild}`);
