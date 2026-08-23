import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuthModule } from '../auth/auth.module';
import { AdminAuditLogController } from './admin-audit-log.controller';
import { AdminCouponsController } from './admin-coupons.controller';
import { AdminCustomersController } from './admin-customers.controller';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminInventoryController } from './admin-inventory.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { AdminCouponsService } from './admin-coupons.service';
import { AdminCustomersService } from './admin-customers.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminInventoryService } from './admin-inventory.service';
import { AdminOrdersService } from './admin-orders.service';

@Module({
  imports: [OrdersModule, InventoryModule, AuthModule],
  controllers: [
    AdminDashboardController,
    AdminOrdersController,
    AdminCustomersController,
    AdminInventoryController,
    AdminCouponsController,
    AdminAuditLogController,
  ],
  providers: [
    AdminDashboardService,
    AdminOrdersService,
    AdminCustomersService,
    AdminInventoryService,
    AdminCouponsService,
  ],
})
export class AdminModule {}
