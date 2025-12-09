import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'Correo electrónico registrado',
    example: 'juan@example.com',
  })
  @IsEmail()
  email: string;
}