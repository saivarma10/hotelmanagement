import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCategoryDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  sortOrder?: number;
}

export class CreateMenuItemDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsBoolean()
  isVeg?: boolean;

  @IsString()
  categoryId!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariationInputDto)
  variations?: VariationInputDto[];

  @IsOptional()
  @IsArray()
  addonIds?: string[];
}

export class VariationInputDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}

export class CreateAddonDto {
  @IsString()
  name!: string;

  @IsNumber()
  @Min(0)
  price!: number;
}

export class UpdateMenuItemDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
