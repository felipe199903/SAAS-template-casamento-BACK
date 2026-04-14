import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import MercadoPagoConfig, { Payment } from 'mercadopago';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseDto } from './dto/purchase.dto';

@Injectable()
export class PurchasesService {
  private readonly logger = new Logger(PurchasesService.name);

  constructor(private prisma: PrismaService) {}

  private getMpClient(): MercadoPagoConfig {
    const accessToken = process.env.MP_ACCESS_TOKEN;
    if (!accessToken) {
      throw new BadRequestException('MP_ACCESS_TOKEN não configurado no servidor');
    }
    return new MercadoPagoConfig({ accessToken });
  }

  async create(userId: string, dto: CreatePurchaseDto) {
    const [wedding, user] = await Promise.all([
      this.prisma.wedding.findUnique({ where: { id: dto.weddingId } }),
      this.prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    ]);
    if (!wedding) throw new NotFoundException('Casamento não encontrado');
    if (wedding.userId !== userId) throw new BadRequestException('Casamento não pertence ao usuário');
    if (wedding.paid) throw new BadRequestException('Site já está ativo');

    const paymentMethod = dto.paymentMethod || 'pix';

    // Idempotency: return existing PIX PENDING (has QR code already)
    const existing = await this.prisma.purchase.findFirst({
      where: { weddingId: dto.weddingId, status: { in: ['PENDING', 'PAID'] } },
    });
    if (existing?.status === 'PAID') throw new BadRequestException('Pagamento já confirmado');
    if (existing?.status === 'PENDING' && paymentMethod === 'pix' && existing.pixQrCode) {
      return existing;
    }

    const amount = parseFloat(process.env.SITE_PRICE_BRL || '50');
    const description = `CasalPerfeito - ${wedding.groomName} & ${wedding.brideName}`;
    const notificationUrl = `${process.env.BACKEND_URL || 'https://saas-template-casamento-back-production.up.railway.app/api'}/payments/webhook/mercadopago`;

    const purchase = existing ?? await this.prisma.purchase.create({
      data: { userId, weddingId: dto.weddingId, amount, status: 'PENDING' },
    });

    try {
      const paymentClient = new Payment(this.getMpClient());

      if (paymentMethod === 'credit_card') {
        if (!dto.cardToken) throw new BadRequestException('Token do cartão não fornecido');
        if (!dto.paymentMethodId) throw new BadRequestException('Bandeira do cartão não fornecida');
        if (!dto.payerCpf) throw new BadRequestException('CPF do pagador não fornecido');

        const mpPayment = await paymentClient.create({
          body: {
            transaction_amount: amount,
            description,
            payment_method_id: dto.paymentMethodId,
            token: dto.cardToken,
            installments: dto.installments || 1,
            payer: {
              email: user?.email || `user-${userId}@casalperfeito.com`,
              identification: { type: 'CPF', number: dto.payerCpf.replace(/\D/g, '') },
            },
            external_reference: purchase.id,
            notification_url: notificationUrl,
          },
        });

        let newStatus: 'PENDING' | 'PAID' | 'FAILED' = 'PENDING';
        if (mpPayment.status === 'approved') newStatus = 'PAID';
        else if (mpPayment.status === 'rejected' || mpPayment.status === 'cancelled') newStatus = 'FAILED';

        const updated = await this.prisma.purchase.update({
          where: { id: purchase.id },
          data: { externalPaymentId: String(mpPayment.id), status: newStatus },
        });

        if (newStatus === 'PAID') {
          await this.prisma.wedding.update({ where: { id: wedding.id }, data: { paid: true } });
        }

        if (newStatus === 'FAILED') {
          const detail = (mpPayment as any).status_detail || mpPayment.status || 'recusado';
          throw new BadRequestException(`Pagamento recusado pelo emissor: ${detail}`);
        }

        return updated;
      } else {
        // PIX
        const mpPayment = await paymentClient.create({
          body: {
            transaction_amount: amount,
            description,
            payment_method_id: 'pix',
            payer: { email: user?.email || `user-${userId}@casalperfeito.com` },
            external_reference: purchase.id,
            notification_url: notificationUrl,
          },
        });

        const pixData = mpPayment.point_of_interaction?.transaction_data;
        return this.prisma.purchase.update({
          where: { id: purchase.id },
          data: {
            externalPaymentId: String(mpPayment.id),
            pixQrCode: pixData?.qr_code_base64 || null,
            pixCopyPaste: pixData?.qr_code || null,
          },
        });
      }
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      const mpError = err?.cause?.[0]?.description || err?.message || 'unknown';
      this.logger.error(`MP error for purchase ${purchase.id}: ${mpError}`);
      throw new BadRequestException(`Erro ao gerar pagamento: ${mpError}`);
    }
  }

  async getStatus(userId: string, purchaseId: string) {
    const purchase = await this.prisma.purchase.findUnique({ where: { id: purchaseId } });
    if (!purchase) throw new NotFoundException('Compra não encontrada');
    if (purchase.userId !== userId) throw new BadRequestException('Compra não pertence ao usuário');
    return { id: purchase.id, status: purchase.status };
  }
}
