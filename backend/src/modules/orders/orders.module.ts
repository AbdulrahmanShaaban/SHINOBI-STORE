import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { WebhookService } from './webhook.service';
import { OrdersSweeperService } from './orders-sweeper.service';
import { InventoryModule } from '../inventory/inventory.module';
import { CartModule } from '../cart/cart.module';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService, WebhookService, OrdersSweeperService],
  imports: [InventoryModule, CartModule],
  exports: [OrdersService],
})
export class OrdersModule {}
