import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const ORDER_STATUSES = [
  'pending_payment',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
] as const;

export class AdminOrderQueryDto {
  @ApiPropertyOptional({ enum: ORDER_STATUSES })
  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: (typeof ORDER_STATUSES)[number];

  @IsOptional() @IsString() @MaxLength(120)
  q?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  /** Hard-capped page size keeps list queries bounded. */
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit?: number;
}

export class OrderTransitionDto {
  @ApiProperty({ enum: ['processing', 'shipped', 'delivered', 'cancelled'] })
  @IsIn(['processing', 'shipped', 'delivered', 'cancelled'])
  to!: 'processing' | 'shipped' | 'delivered' | 'cancelled';

  @IsOptional() @IsString() @MaxLength(255)
  note?: string;
}
