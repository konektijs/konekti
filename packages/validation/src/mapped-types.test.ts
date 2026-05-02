import { describe, expect, it } from 'vitest';

import { IsEmail, IsString } from './decorators.js';
import { IntersectionType, OmitType, PartialType, PickType } from './mapped-types.js';
import { DefaultValidator } from './validation.js';

describe('mapped DTO helpers', () => {
  it('PickType initializes only the selected keys on the derived instance', () => {
    class UserDto {
      name = 'Fluo';
      email = 'hello@example.com';
    }

    const UserEmailDto = PickType(UserDto, ['email']);

    expect(UserEmailDto.name).toBe('UserDtoPickType');
    expect(new UserEmailDto()).toEqual({ email: undefined });
  });

  it('OmitType removes omitted keys from the derived initializer', () => {
    class UserDto {
      name = 'Fluo';
      email = 'hello@example.com';
      passwordHash = 'secret';
    }

    const PublicUserDto = OmitType(UserDto, ['passwordHash']);

    expect(PublicUserDto.name).toBe('UserDtoOmitType');
    expect(new PublicUserDto()).toEqual({ email: undefined, name: undefined });
  });

  it('PartialType initializes every base key as undefined for patch-style DTOs', () => {
    class CreateUserDto {
      email = 'hello@example.com';
      name = 'Fluo';
    }

    const UpdateUserDto = PartialType(CreateUserDto);

    expect(UpdateUserDto.name).toBe('CreateUserDtoPartialType');
    expect(new UpdateUserDto()).toEqual({ email: undefined, name: undefined });
    expect(new CreateUserDto()).toEqual({ email: 'hello@example.com', name: 'Fluo' });
  });

  it('IntersectionType merges keys from every base DTO into one derived initializer', () => {
    class PagingDto {
      cursor = 'next';
    }

    class SearchDto {
      query = 'fluo';
    }

    class FilterDto {
      scope = 'public';
    }

    const SearchPageDto = IntersectionType(PagingDto, SearchDto, FilterDto);

    expect(SearchPageDto.name).toBe('PagingDtoSearchDtoFilterDtoIntersectionType');
    expect(new SearchPageDto()).toEqual({ cursor: undefined, query: undefined, scope: undefined });
  });

  it('preserves selected validation metadata on mapped DTO helpers', async () => {
    class UserDto {
      @IsString()
      name = '';

      @IsEmail()
      email = '';
    }

    const UserEmailDto = PickType(UserDto, ['email']);
    const PublicUserDto = OmitType(UserDto, ['email']);
    const validator = new DefaultValidator();

    await expect(validator.materialize({ email: 'not-an-email' }, UserEmailDto)).rejects.toMatchObject({
      issues: [{ code: 'EMAIL', field: 'email', message: 'email is invalid.' }],
    });

    await expect(validator.materialize({ email: 'not-an-email', name: 'Fluo' }, PublicUserDto)).resolves.toMatchObject({
      name: 'Fluo',
    });
  });
});
