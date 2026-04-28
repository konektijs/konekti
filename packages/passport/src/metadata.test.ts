import { Controller, Get } from '@fluojs/http';
import { describe, expect, it } from 'vitest';

import { RequireScopes, UseAuth, UseOptionalAuth } from './decorators.js';
import { getAuthRequirement } from './metadata.js';

describe('auth metadata scope merge', () => {
  it('deduplicates scope requirements across class and method decorators', () => {
    @Controller('/metadata')
    @UseAuth('jwt')
    @RequireScopes('profile:read')
    @RequireScopes('profile:read', 'profile:write')
    class ProfileController {
      @Get('/')
      @RequireScopes('profile:read')
      @RequireScopes('profile:write', 'profile:write')
      getProfile() {
        return undefined;
      }
    }

    expect(getAuthRequirement(ProfileController)).toEqual({
      optional: false,
      scopes: ['profile:read', 'profile:write'],
      strategy: 'jwt',
    });
    expect(getAuthRequirement(ProfileController, 'getProfile')).toEqual({
      optional: false,
      scopes: ['profile:read', 'profile:write'],
      strategy: 'jwt',
    });
  });

  it('keeps class scopes while method strategy overrides class strategy', () => {
    @Controller('/metadata')
    @UseAuth('jwt')
    @RequireScopes('profile:read')
    class ProfileController {
      @Get('/')
      @UseAuth('session')
      @RequireScopes('profile:read', 'profile:write')
      getProfile() {
        return undefined;
      }
    }

    expect(getAuthRequirement(ProfileController, 'getProfile')).toEqual({
      optional: false,
      scopes: ['profile:read', 'profile:write'],
      strategy: 'session',
    });
  });

  it('lets protected routes override optional controller-level auth requirements', () => {
    @Controller('/metadata')
    @UseOptionalAuth('cookie')
    class ProfileController {
      @Get('/')
      @UseAuth('cookie')
      getProfile() {
        return undefined;
      }
    }

    expect(getAuthRequirement(ProfileController)).toEqual({
      optional: true,
      strategy: 'cookie',
    });
    expect(getAuthRequirement(ProfileController, 'getProfile')).toEqual({
      optional: false,
      strategy: 'cookie',
    });
  });

  it('reuses cached merged requirements between repeated lookups', () => {
    @Controller('/metadata')
    @UseAuth('jwt')
    @RequireScopes('profile:read')
    class ProfileController {
      @Get('/')
      @RequireScopes('profile:write')
      getProfile() {
        return undefined;
      }
    }

    const firstClassRequirement = getAuthRequirement(ProfileController);
    const secondClassRequirement = getAuthRequirement(ProfileController);
    const firstMethodRequirement = getAuthRequirement(ProfileController, 'getProfile');
    const secondMethodRequirement = getAuthRequirement(ProfileController, 'getProfile');

    expect(secondClassRequirement).toBe(firstClassRequirement);
    expect(secondMethodRequirement).toBe(firstMethodRequirement);
  });
});
