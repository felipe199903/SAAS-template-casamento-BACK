import {
  Body,
  Controller,
  Headers,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Public()
  @Post('webhook/mercadopago')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: any,
    @Headers('x-signature') xSignature: string = '',
    @Headers('x-request-id') xRequestId: string = '',
  ) {
    const dataId = body?.data?.id ? String(body.data.id) : '';

    const valid = this.paymentsService.validateMpSignature(
      req.rawBody?.toString() || '',
      xSignature,
      xRequestId,
      dataId,
    );

    if (!valid) {
      throw new UnauthorizedException('Assinatura do webhook inválida');
    }

    return this.paymentsService.processWebhook(body);
  }
}

