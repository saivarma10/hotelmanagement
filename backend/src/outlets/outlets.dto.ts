import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateOutletDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate?: number;
}

export class UpdateOutletDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  gstNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  gstRate?: number;
}

export class CreateAreaDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateTableDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;
}
