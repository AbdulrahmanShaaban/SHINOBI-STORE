import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PaymentReconService } from './payment-recon.service';
import { MaintenanceService } from './maintenance.service';
import { QueueSchedulerService } from './queue-scheduler.service';
import { QueueAdminService } from './queue-admin.service';
import { QueueAdminController } from './queue-admin.controller';

/**
 * §17 background jobs. Plain module (the lead wires it in app.module.ts):
 * exports the job services so schedulers/tests can run them directly.
 * PAYMENT_PROVIDER / Prisma / Redis / Audit arrive via their global modules;
 * OrdersModule is imported because reconciliation drives OrdersService.
 */
@Module({
  imports: [OrdersModule],
  controllers: [QueueAdminController],
  providers: [PaymentReconService, MaintenanceService, QueueSchedulerService, QueueAdminService],
  exports: [PaymentReconService, MaintenanceService, QueueSchedulerService, QueueAdminService],
})
export class QueueModule {}
