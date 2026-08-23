import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddCartItemDto, MergeCartDto, UpdateCartItemDto } from './dto/cart.dto';
import { UserId } from '../../common/rbac/current-user.decorator';

/**
 * Server-side cart for authenticated users (§9.1). Every query is scoped to
 * the session user server-side — client-supplied cart/line ids are never
 * trusted on their own.
 */
@ApiTags('cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Current user cart with live variant data' })
  get(@UserId() userId: string) {
    return this.cart.getCart(userId);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add a variant (quantity clamped to live availability)' })
  add(@UserId() userId: string, @Body() body: AddCartItemDto) {
    return this.cart.addItem(userId, body.variantId, body.quantity);
  }

  @Patch('items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update one of the caller's lines" })
  update(@UserId() userId: string, @Param('id') id: string, @Body() body: UpdateCartItemDto) {
    return this.cart.updateItem(userId, id, body.quantity);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Remove one of the caller's lines" })
  remove(@UserId() userId: string, @Param('id') id: string) {
    return this.cart.removeItem(userId, id);
  }

  @Post('merge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Merge a guest cart at login (untrusted input, clamped)' })
  merge(@UserId() userId: string, @Body() body: MergeCartDto) {
    return this.cart.merge(userId, body.items);
  }
}
