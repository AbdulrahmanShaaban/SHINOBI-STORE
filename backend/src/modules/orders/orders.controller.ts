import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Param, Post, Req, RawBodyRequest } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { WebhookService } from './webhook.service';
import { UserIdOptional } from '../../common/rbac/current-user.decorator';
import { Public } from '../../common/guards/public.decorator';
import { PlaceOrderDto } from './dto/place-order.dto';

/**
 * §14.2 flow. POST /orders is guest-capable (§10.3 userId?): auth is soft —
 * server-side pricing, the idempotency key and inventory reservation are the
 * real gates. Everything else about the request is validated by DTOs.
 */
@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly webhooks: WebhookService,
  ) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Place an order (server-priced, reserving, idempotent; guests allowed)' })
  async place(@UserIdOptional() userId: string | undefined, @Body() body: PlaceOrderDto) {
    const lines = body.lines ?? [];
    return this.orders.placeOrderFromLines({
      userId,
      contactEmail: body.contactEmail,
      shippingAddress: body.shippingAddress,
      couponCode: body.couponCode,
      idempotencyKey: body.idempotencyKey,
      // Authed users with a server cart may omit lines; guests post explicit
      // ones. Either way the service re-prices everything server-side.
      lines:
        lines.length > 0
          ? lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity }))
          : userId
            ? await this.orders.linesFromServerCart(userId)
            : [],
    });
  }

  @Get('mine/list')
  list(@UserIdOptional() userId?: string) {
    return userId ? this.orders.listForUser(userId) : Promise.resolve([]);
  }

  /** Lightweight polling endpoint for /checkout/return (§14.2). */
  @Public()
  @Get('status/:orderNumber')
  @HttpCode(HttpStatus.OK)
  status(@Param('orderNumber') orderNumber: string) {
    return this.orders.getOrderStatus(orderNumber);
  }

  // Guest-capable detail: possession of the order number is the capability.
  @Public()
  @Get(':orderNumber')
  detail(@Param('orderNumber') orderNumber: string, @UserIdOptional() userId?: string) {
    return userId
      ? this.orders.getByOrderNumberForUser(orderNumber, userId)
      : this.orders.getByOrderNumberForGuest(orderNumber);
  }

  @Public()
  @Post('webhooks/stripe')
  @HttpCode(HttpStatus.OK)
  @ApiBody({ description: 'Stripe event (raw body, signature-verified)' })
  stripeWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    return this.webhooks.handleStripeWebhook(req.rawBody, signature);
  }
}
