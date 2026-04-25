import { describe, expect, it } from 'vitest';
import {
  firstEnforcedReleaseIntentVersion,
  requiresReleaseIntentRecords,
  validateReleaseIntentRecord,
  validateReleaseIntentRecords,
} from './release-intents.mjs';

const publicPackageNames = ['@fluojs/cli', '@fluojs/core'];
const packageManifests = publicPackageNames.map((packageName) => ({
  manifest: {
    name: packageName,
    private: false,
    publishConfig: { access: 'public' },
  },
  packageJsonPath: `/repo/packages/${packageName.slice('@fluojs/'.length)}/package.json`,
}));

function createRecord(overrides: Record<string, unknown> = {}): unknown {
  return {
    packages: [
      {
        disposition: 'release',
        package: '@fluojs/cli',
        rationale: 'The CLI package owns the affected generated starter contract.',
        semver: 'patch',
        summary: 'Clarify CLI startup behavior for the beta.2 candidate.',
      },
    ],
    version: firstEnforcedReleaseIntentVersion,
    ...overrides,
  };
}

function dependencies() {
  return {
    packageManifests,
    publicPackageNames,
  };
}

describe('validateReleaseIntentRecord', () => {
  it('accepts a valid @fluojs/cli patch release intent', () => {
    const result = validateReleaseIntentRecord(createRecord(), dependencies());

    expect(result.version).toBe('1.0.0-beta.2');
    expect(result.packages).toEqual([
      expect.objectContaining({
        disposition: 'release',
        package: '@fluojs/cli',
        semver: 'patch',
        summary: 'Clarify CLI startup behavior for the beta.2 candidate.',
      }),
    ]);
  });

  it('fails when required fields are missing', () => {
    expect(() =>
      validateReleaseIntentRecord(
        createRecord({
          packages: [
            {
              package: '@fluojs/cli',
            },
          ],
          version: '',
        }),
        dependencies(),
      ),
    ).toThrowError(/version is required.*disposition.*semver.*summary.*rationale/u);
  });

  it('fails when a major intent omits a migration note', () => {
    expect(() =>
      validateReleaseIntentRecord(
        createRecord({
          packages: [
            {
              disposition: 'release',
              package: '@fluojs/cli',
              rationale: 'The CLI package owns the affected generated starter contract.',
              semver: 'major',
              summary: 'Remove a documented CLI option.',
            },
          ],
        }),
        dependencies(),
      ),
    ).toThrowError(/migrationNote is required for major or breaking release intents/u);
  });

  it('fails when an explicit breaking intent omits a migration note', () => {
    expect(() =>
      validateReleaseIntentRecord(
        createRecord({
          packages: [
            {
              breaking: true,
              disposition: 'release',
              package: '@fluojs/cli',
              rationale: 'The CLI package owns the affected generated starter contract.',
              semver: 'minor',
              summary: 'Change CLI bootstrap defaults during preview stabilization.',
            },
          ],
        }),
        dependencies(),
      ),
    ).toThrowError(/migrationNote is required for major or breaking release intents/u);
  });

  it('accepts a breaking intent when a migration note is present', () => {
    expect(() =>
      validateReleaseIntentRecord(
        createRecord({
          packages: [
            {
              breaking: true,
              disposition: 'release',
              migrationNote: 'Regenerate starters with `fluo new` or update `src/main.ts` to the adapter-first bootstrap.',
              package: '@fluojs/cli',
              rationale: 'The CLI package owns the affected generated starter contract.',
              semver: 'minor',
              summary: 'Change CLI bootstrap defaults during preview stabilization.',
            },
          ],
        }),
        dependencies(),
      ),
    ).not.toThrow();
  });

  it('fails when an intent references an unknown public package', () => {
    expect(() =>
      validateReleaseIntentRecord(
        createRecord({
          packages: [
            {
              disposition: 'release',
              package: '@fluojs/not-a-package',
              rationale: 'This package does not exist in the public workspace surface.',
              semver: 'patch',
              summary: 'Invalid package should fail validation.',
            },
          ],
        }),
        dependencies(),
      ),
    ).toThrowError(/unknown public workspace package @fluojs\/not-a-package/u);
  });
});

describe('validateReleaseIntentRecords', () => {
  it('does not require backfilled intent records through 1.0.0-beta.1', () => {
    expect(validateReleaseIntentRecords([], { ...dependencies(), candidateVersion: '1.0.0-beta.1' })).toEqual([]);
    expect(requiresReleaseIntentRecords('1.0.0-beta.1')).toBe(false);
  });

  it('requires fixture/candidate intent records from 1.0.0-beta.2 onward', () => {
    expect(requiresReleaseIntentRecords('1.0.0-beta.2')).toBe(true);
    expect(requiresReleaseIntentRecords('1.0.0')).toBe(true);
    expect(() => validateReleaseIntentRecords([], { ...dependencies(), candidateVersion: '1.0.0-beta.2' })).toThrowError(
      /release intent records are required.*1\.0\.0-beta\.2/u,
    );
  });
});
