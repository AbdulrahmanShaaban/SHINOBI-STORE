import { Body, Controller, Post, HttpCode, HttpStatus, Inject, BadRequestException } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { DemoPaymentProvider } from './demo-payment.provider';
import { PAYMENT_PROVIDER, type PaymentProvider } from './payment-provider.port';
import { OrdersService } from '../orders/orders.service';

export class ProcessDemoPaymentDto {
  @IsString()
  @IsNotEmpty()
  clientSecret!: string;

  @IsString()
  @IsNotEmpty()
  cardholderName!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}\s?\d{4}\s?\d{4}\s?\d{4}$/, { message: 'Card number must be 16 digits' })
  cardNumber!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Expiry must be MM/YY' })
  expiry!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(4)
  @Matches(/^\d+$/, { message: 'CVC must be digits only' })
  cvc!: string;
}

export class CompleteDemoActionDto {
  @IsString()
  @IsNotEmpty()
  clientSecret!: string;
}

/**
 * Demo payment processing endpoint. Accepts card data, runs it through the
 * DemoPaymentProvider state machine, and tells the OrdersService the outcome.
 * No real card data is ever stored.
 */
@ApiTags('payments')
@Controller('payments')
export class DemoPaymentsController {
  private readonly demoProvider: DemoPaymentProvider | null;

  constructor(
    @Inject(PAYMENT_PROVIDER) paymentProvider: PaymentProvider,
    private readonly orders: OrdersService,
  ) {
    this.demoProvider = paymentProvider instanceof DemoPaymentProvider ? paymentProvider : null;
  }

  @Post('demo/process')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process a demo payment with test card data' })
  @ApiBody({ type: ProcessDemoPaymentDto })
  async processPayment(@Body() body: ProcessDemoPaymentDto) {
    if (!this.demoProvider) {
      throw new BadRequestException('Demo payment provider is not active');
    }

    const result = await this.demoProvider.processCardSubmission(body.clientSecret, {
      number: body.cardNumber,
      expMonth: parseInt(body.expiry.split('/')[0], 10),
      expYear: parseInt('20' + body.expiry.split('/')[1], 10),
      cvc: body.cvc,
    });

    if (result.status === 'succeeded') {
      await this.orders.confirmByProviderRef(result.providerRef);
    } else if (result.status === 'failed') {
      await this.orders.failPaymentByProviderRef(
        result.providerRef,
        result.message ?? 'Demo payment failed',
      );
    }

    return {
      status: result.status,
      message: result.message,
      providerRef: result.providerRef,
    };
  }

  @Post('demo/complete-action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a requires_action demo payment (simulates 3DS)' })
  @ApiBody({ type: CompleteDemoActionDto })
  async completeAction(@Body() body: CompleteDemoActionDto) {
    if (!this.demoProvider) {
      throw new BadRequestException('Demo payment provider is not active');
    }

    const result = await this.demoProvider.completeAction(body.clientSecret);

    if (result.status === 'succeeded') {
      await this.orders.confirmByProviderRef(result.providerRef);
    }

    return {
      status: result.status,
      providerRef: result.providerRef,
    };
  }
}
