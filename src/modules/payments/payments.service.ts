import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Valida assinatura HMAC-SHA256 do webhook Mercado Pago
   * Ref: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
   */
  validateMpSignature(
    rawBody: string,
    xSignature: string,
    xRequestId: string,
    dataId: string,
  ): boolean {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) {
      this.logger.warn('MP_WEBHOOK_SECRET não configurado - pulando validação em dev');
      return true; // Em dev sem secret configurado
    }

    // Formato: ts=<timestamp>,v1=<hmac>
    const parts = xSignature.split(',');
    const ts = parts.find((p) => p.startsWith('ts='))?.split('=')[1];
    const v1 = parts.find((p) => p.startsWith('v1='))?.split('=')[1];

    if (!ts || !v1) throw new UnauthorizedException('Assinatura inválida');

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    const bufV1 = Buffer.from(v1);
    const bufExpected = Buffer.from(expected);
    if (bufV1.length !== bufExpected.length) return false;
    return crypto.timingSafeEqual(bufV1, bufExpected);
  }

  async processWebhook(payload: any) {
    this.logger.log(`Webhook recebido: ${payload.type} - ${payload.data?.id}`);

    // Salva webhook para auditoria (sem vincular a purchase ainda)
    if (payload.type !== 'payment') return { received: true };

    const externalPaymentId = String(payload.data?.id);

    // Busca purchase pelo external_payment_id
    const purchase = await this.prisma.purchase.findFirst({
      where: { externalPaymentId },
    });

    // Salva auditoria
    if (purchase) {
      await this.prisma.payment.create({
        data: {
          purchaseId: purchase.id,
          status: payload.action || 'webhook',
          payload: payload,
        },
      });
    }

    if (!purchase) {
      this.logger.warn(`Purchase não encontrada para external ID: ${externalPaymentId}`);
      return { received: true };
    }

    // Idempotência: ignorar se já PAID
    if (purchase.status === 'PAID') return { received: true };

    if (payload.action === 'payment.updated' || payload.action === 'payment.created') {
      if (payload.data?.status === 'approved') {
        await this.prisma.$transaction([
          this.prisma.purchase.update({
            where: { id: purchase.id },
            data: { status: 'PAID' },
          }),
          this.prisma.wedding.update({
            where: { id: purchase.weddingId },
            data: { paid: true },
          }),
        ]);
        this.logger.log(`Purchase ${purchase.id} confirmada - wedding ${purchase.weddingId} ativado`);
      } else if (['rejected', 'cancelled', 'refunded'].includes(payload.data?.status)) {
        await this.prisma.purchase.update({
          where: { id: purchase.id },
          data: { status: 'FAILED' },
        });
      }
    }

    return { received: true };
  }
}
