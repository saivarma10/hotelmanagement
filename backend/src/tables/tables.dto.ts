import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

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
