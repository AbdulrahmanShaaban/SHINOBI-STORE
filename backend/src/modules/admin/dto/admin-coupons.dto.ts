import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCouponDto {
  @ApiProperty({ minLength: 3, maxLength: 40 })
  @IsString() @MinLength(3) @MaxLength(40)
  code!: string;

  @ApiProperty({ enum: ['percent', 'fixed'] })
  @IsIn(['percent', 'fixed'])
  type!: 'percent' | 'fixed';

  /** >0 always; percent values are additionally capped at 90 (service-level). */
  @Type(() => Number) @IsInt() @Min(1)
  value!: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  minSubtotalCents?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  maxDiscountCents?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  usageLimit?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  perUserLimit?: number;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional() @IsISO8601()
  startsAt?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional() @IsISO8601()
  endsAt?: string;
}

export class ListCouponsQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;
}

export class UpdateCouponDto {
  @IsOptional() @IsBoolean()
  isActive?: boolean;

  @IsOptional() @IsISO8601()
  endsAt?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  usageLimit?: number;
}
