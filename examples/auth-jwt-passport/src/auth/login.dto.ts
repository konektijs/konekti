import { FromBody } from '@konekti/http';
import { IsNotEmpty, IsString } from '@konekti/validation';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @FromBody('username')
  username!: string;
}
