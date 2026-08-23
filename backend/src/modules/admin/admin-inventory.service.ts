import { Injectable } from '@nestjs/common';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { AdjustInventoryDto } from './dto/admin-inventory.dto';

/**
 * Thin admin wrapper: the domain mutation lives in InventoryService (its
 * InventoryTransaction ledger is the stock trail); this adds the staff-action
 * audit row on top.
 */
@Injectable()
export class AdminInventoryService {
  constructor(
    private readonly inventory: InventoryService,
    private readonly audit: AuditService,
  ) {}

  async adjust(actorUserId: string, ip: string | undefined, body: AdjustInventoryDto) {
    const result = await this.inventory.adjust({
      variantId: body.variantId,
      delta: body.delta,
      reason: body.reason,
      actorUserId,
    });
    await this.audit.record(
      actorUserId,
      'inventory.adjust',
      'product_variant',
      body.variantId,
      { delta: body.delta, reason: body.reason, stockOnHand: result.stockOnHand },
      ip,
    );
    return result;
  }
}
