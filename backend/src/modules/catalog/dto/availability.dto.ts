import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsUUID,
} from 'class-validator';

/**
 * POST /products/availability — live purchasability for a batch of variants.
 * Powers cart revalidation (drawer open) and later checkout price authority.
 * Bounded batch size; unknown/draft-linked ids are simply absent from the
 * response, which clients must treat as "not purchasable".
 */
export class AvailabilityDto {
  @ApiProperty({ type: [String], description: 'Variant uuids to check', maxItems: 50 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsUUID('4', { each: true })
  @Type(() => String)
  variantIds!: string[];
}

export interface VariantAvailability {
  variantId: string;
  isActive: boolean;
  priceCents: number;
  compareAtPriceCents: number | null;
  /** stock minus reserved, floored at zero (plan §10.2). */
  available: number;
  productSlug: string;
}
