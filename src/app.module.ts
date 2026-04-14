import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { AdminModule } from './modules/admin/admin.module';
import { AuthModule } from './modules/auth/auth.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { PresentsModule } from './modules/presents/presents.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { WeddingsModule } from './modules/weddings/weddings.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    WeddingsModule,
    PresentsModule,
    PurchasesModule,
    PaymentsModule,
    AdminModule,
  ],
  providers: [
    // JWT guard global — rotas públicas usam @Public()
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}

