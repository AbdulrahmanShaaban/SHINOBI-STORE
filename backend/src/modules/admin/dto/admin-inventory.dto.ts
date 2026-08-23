import { Type } from 'class-transformer';
import { IsInt, IsString, IsUUID, Max, MaxLength, Min, MinLength, NotEquals } from 'class-validator';

export class AdjustInventoryDto {
  @IsUUID('4')
  variantId!: string;

  /** Signed correction; zero is meaningless and rejected. */
  @Type(() => Number) @IsInt() @Min(-10_000) @Max(10_000) @NotEquals(0)
  delta!: number;

  @IsString() @MinLength(1) @MaxLength(255)
  reason!: string;
}
