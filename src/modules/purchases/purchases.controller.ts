import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreatePurchaseDto } from './dto/purchase.dto';
import { PurchasesService } from './purchases.service';

@UseGuards(JwtAuthGuard)
@Controller('purchases')
export class PurchasesController {
  constructor(private purchasesService: PurchasesService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreatePurchaseDto) {
    return this.purchasesService.create(user.id, dto);
  }

  @Get(':id/status')
  getStatus(@CurrentUser() user: any, @Param('id') id: string) {
    return this.purchasesService.getStatus(user.id, id);
  }
}
