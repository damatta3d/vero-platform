import { randomUUID } from 'node:crypto';
import { Inject, Module, type DynamicModule, type OnApplicationShutdown } from '@nestjs/common';
import { CatalogService, type CatalogRepository } from '@vero/business-catalog';
import { FinanceService, type FinanceRepository } from '@vero/business-finance';
import { InventoryService, type InventoryIngredientCatalog, type InventoryRepository } from '@vero/business-inventory';
import { ProductionService, type ProductionRepository } from '@vero/business-production';
import { SalesService, type SalesRepository } from '@vero/business-sales';
import type { AppConfig } from '@vero/core-configuration';
import { createDatabaseClient, PrismaCatalogRepository, PrismaFinanceEntryRepository, PrismaInventoryRepository, PrismaOperationalEntryRepository, PrismaProductionRepository, PrismaSalesRepository } from '@vero/infrastructure-database';
import { APP_CONFIG } from '../app.tokens.js';
import { FinanceController } from '../finance/finance.controller.js'; import { FinancePageController } from '../finance/finance-page.controller.js'; import { FINANCE_REPOSITORY } from '../finance/finance.tokens.js';
import { InventoryController } from '../inventory/inventory.controller.js'; import { INVENTORY_REPOSITORY } from '../inventory/inventory.tokens.js';
import { KitchenOrderController } from '../menu/kitchen-order.controller.js'; import { MenuAdminController } from '../menu/menu-admin.controller.js'; import { NativeOrderController } from '../menu/native-order.controller.js'; import { PaymentController } from '../menu/payment.controller.js'; import { PaymentWebhookController } from '../menu/payment-webhook.controller.js'; import { PublicCheckoutController } from '../menu/public-checkout.controller.js'; import { PublicMenuController } from '../menu/public-menu.controller.js'; import { PublicMenuPageController } from '../menu/public-menu-page.controller.js'; import { PublicOrderStatusController } from '../menu/public-order-status.controller.js';
import { OperationalEntryController } from '../operations/operational-entry.controller.js'; import { OperationalEntryService } from '../operations/operational-entry.service.js'; import { OPERATIONAL_ENTRY_REPOSITORY } from '../operations/operational-entry.tokens.js'; import { OperationsPageController } from '../operations/operations-page.controller.js'; import { PortalPageController } from '../portal/portal-page.controller.js'; import { ProductionController } from '../production/production.controller.js'; import { PRODUCTION_REPOSITORY } from '../production/production.tokens.js'; import { SalesController } from '../sales/sales.controller.js'; import { SALES_REPOSITORY } from '../sales/sales.tokens.js';
import { CatalogController } from './catalog.controller.js'; import { CATALOG_REPOSITORY, DATABASE_CLIENT } from './catalog.tokens.js'; import { MvpSecurityService } from './mvp-security.service.js'; import { MvpPageController } from './mvp-page.controller.js';
type DatabaseClient = ReturnType<typeof createDatabaseClient>;
class DatabaseLifecycle implements OnApplicationShutdown { constructor(@Inject(DATABASE_CLIENT) private readonly client: DatabaseClient) {} async onApplicationShutdown(): Promise<void> { await this.client.$disconnect(); } }
@Module({})
export class CatalogModule {
 static register(config: AppConfig): DynamicModule { return { module: CatalogModule,
 controllers: [PortalPageController,CatalogController,InventoryController,ProductionController,SalesController,FinanceController,FinancePageController,OperationalEntryController,OperationsPageController,MvpPageController,PublicMenuController,PublicMenuPageController,PublicCheckoutController,PaymentController,PaymentWebhookController,NativeOrderController,KitchenOrderController,PublicOrderStatusController,MenuAdminController],
 providers: [
 { provide: APP_CONFIG,useValue: config }, { provide: DATABASE_CLIENT,useFactory: () => createDatabaseClient(config.postgres.url) },
 { provide: CATALOG_REPOSITORY,inject:[DATABASE_CLIENT],useFactory:(client:DatabaseClient)=>new PrismaCatalogRepository(client) }, { provide: CatalogService,inject:[CATALOG_REPOSITORY],useFactory:(repository:CatalogRepository)=>new CatalogService(repository,{generate:randomUUID},{now:()=>new Date()}) },
 { provide: INVENTORY_REPOSITORY,inject:[DATABASE_CLIENT],useFactory:(client:DatabaseClient)=>new PrismaInventoryRepository(client) }, { provide: InventoryService,inject:[INVENTORY_REPOSITORY],useFactory:(repository:InventoryRepository & InventoryIngredientCatalog)=>new InventoryService(repository,repository,{generate:randomUUID},{now:()=>new Date()}) },
 { provide: PRODUCTION_REPOSITORY,inject:[DATABASE_CLIENT],useFactory:(client:DatabaseClient)=>new PrismaProductionRepository(client) }, { provide: ProductionService,inject:[PRODUCTION_REPOSITORY],useFactory:(repository:ProductionRepository)=>new ProductionService(repository,{generate:randomUUID},{now:()=>new Date()}) },
 { provide: SALES_REPOSITORY,inject:[DATABASE_CLIENT],useFactory:(client:DatabaseClient)=>new PrismaSalesRepository(client) }, { provide: SalesService,inject:[SALES_REPOSITORY],useFactory:(repository:SalesRepository)=>new SalesService(repository,{generate:randomUUID},{now:()=>new Date()}) },
 { provide: FINANCE_REPOSITORY,inject:[DATABASE_CLIENT],useFactory:(client:DatabaseClient)=>new PrismaFinanceEntryRepository(client) }, { provide: FinanceService,inject:[FINANCE_REPOSITORY],useFactory:(repository:FinanceRepository)=>new FinanceService(repository,{generate:randomUUID},{now:()=>new Date()}) },
 { provide: OPERATIONAL_ENTRY_REPOSITORY,inject:[DATABASE_CLIENT],useFactory:(client:DatabaseClient)=>new PrismaOperationalEntryRepository(client) }, OperationalEntryService,MvpSecurityService,DatabaseLifecycle ] }; }
}
