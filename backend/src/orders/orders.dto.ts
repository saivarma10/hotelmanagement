import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddOrderItemDto {
  @IsString()
  menuItemId!: string;

  @IsOptional()
  @IsString()
  variationId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  addonIds?: string[];
}

export class SendKotDto {
  @IsOptional()
  @IsArray()
  orderItemIds?: string[];
}

export class SplitBillDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SplitGroupDto)
  groups!: SplitGroupDto[];
}

export class SplitGroupDto {
  @IsArray()
  orderItemIds!: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}
