import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const PRODUCT_SORTS = ['relevance', 'newest', 'price_asc', 'price_desc', 'rating'] as const;
export type ProductSort = (typeof PRODUCT_SORTS)[number];

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** GET /products query contract. All inputs validated; sort is whitelisted. */
export class ProductQueryDto {
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit: number = 12;

  @ApiPropertyOptional({ enum: PRODUCT_SORTS, default: 'relevance' })
  @IsOptional()
  @IsIn(PRODUCT_SORTS as unknown as string[])
  sort: ProductSort = 'relevance';

  @ApiPropertyOptional({ description: 'Filter by category slug' })
  @IsOptional()
  @Matches(SLUG_PATTERN)
  category?: string;

  @ApiPropertyOptional({ description: 'Filter by anime slug' })
  @IsOptional()
  @Matches(SLUG_PATTERN)
  anime?: string;

  @ApiPropertyOptional({ description: 'Filter by character slug' })
  @IsOptional()
  @Matches(SLUG_PATTERN)
  character?: string;

  @ApiPropertyOptional({ description: 'Filter by tag slug' })
  @IsOptional()
  @Matches(SLUG_PATTERN)
  tag?: string;

  @ApiPropertyOptional({ description: 'Minimum variant price in cents', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Maximum variant price in cents', minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  /** §18 URL contract param name. FTS over tsvector + pg_trgm fallback in service. */
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ description: 'Only featured products when true' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  featured?: boolean;
}
