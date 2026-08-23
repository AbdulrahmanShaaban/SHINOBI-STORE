import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class AddressDto {
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) fullName!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(200) line1!: string;
  @IsOptional() @IsString() @MaxLength(200) line2?: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(80) city!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(20) postalCode!: string;
  /** ISO-3166 alpha-2 */
  @ApiProperty() @IsString() @MinLength(2) @MaxLength(2) country!: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
}

export class CheckoutLineDto {
  @IsUUID('4') variantId!: string;
  // Every property needs a validator: the global pipe runs with
  // forbidNonWhitelisted, so undecorated fields are rejected outright.
  @Type(() => Number) @IsInt() @Min(1) @Max(10)
  quantity!: number;
}

export class PlaceOrderDto {
  /** Authed users with a server cart may omit lines; guests post explicit ones. */
  @IsOptional()
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(50)
  @ValidateNested({ each: true }) @Type(() => CheckoutLineDto)
  lines?: CheckoutLineDto[];

  @IsEmail() contactEmail!: string;

  @ValidateNested() @Type(() => AddressDto)
  shippingAddress!: AddressDto;

  @IsOptional() @IsString() @MaxLength(40) couponCode?: string;

  /** §13.1 double-submit protection — required from the client. */
  @IsString() @MinLength(8) @MaxLength(64)
  idempotencyKey!: string;
}
