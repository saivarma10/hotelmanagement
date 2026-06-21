import {
  IsEmail,
  IsString,
  MinLength,
  IsIn,
  IsOptional,
  IsBoolean,
  Matches,
  Length,
} from 'class-validator';
import { UserRole } from '@prisma/client';

const STAFF_ROLES: UserRole[] = ['MANAGER', 'CASHIER', 'CAPTAIN', 'KITCHEN'];

export class CreateStaffDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsIn(STAFF_ROLES)
  role!: UserRole;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin?: string;
}

export class UpdateStaffDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsIn([...STAFF_ROLES])
  role?: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  @Length(4, 4)
  @Matches(/^\d{4}$/, { message: 'PIN must be exactly 4 digits' })
  pin?: string | null;
}

export class ResetStaffPasswordDto {
  @IsString()
  @MinLength(6)
  password!: string;
}

export { STAFF_ROLES };
