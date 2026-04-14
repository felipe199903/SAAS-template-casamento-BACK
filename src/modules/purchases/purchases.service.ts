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
    if (wedding.userId !== userId) {
      throw new BadRequestException('Casamento não pertence ao usuário');
    }
    if (wedding.paid) {
      throw new BadRequestException('Site já está ativo');
    }

    // Verificar se já existe purchase PENDING ou PAID
    const existing = await this.prisma.purchase.findFirst({
      where: {
        weddingId: dto.weddingId,
        status: { in: ['PENDING', 'PAID'] },
      },
    });
    if (existing && existing.status === 'PAID') {
      throw new BadRequestException('Pagamento já confirmado');
    }
    if (existing && existing.status === 'PENDING') {
      // Retorna a compra pendente existente (idempotência)
      return existing;
    }

    const amount = parseFloat(process.env.SITE_PRICE_BRL || '50');

    const purchase = await this.prisma.purchase.create({
      data: {
        userId,
        weddingId: dto.weddingId,
        amount,
        status: 'PENDING',
      },
    });

    // Criar pagamento PIX no Mercado Pago
    try {
      const paymentClient = new Payment(this.getMpClient());
      const mpPayment = await paymentClient.create({
        body: {
          transaction_amount: amount,
          description: `CasalPerfeito - ${wedding.groomName} & ${wedding.brideName}`,
          payment_method_id: 'pix',
          payer: {
            email: user?.email || `user-${userId}@casalperfeito.com`,
          },
          external_reference: purchase.id,
          notification_url: `${process.env.BACKEND_URL || 'https://saas-template-casamento-back-production.up.railway.app/api'}/payments/webhook/mercadopago`,
        },
      });

      const pixData = mpPayment.point_of_interaction?.transaction_data;

      const updated = await this.prisma.purchase.update({
        where: { id: purchase.id },
        data: {
          externalPaymentId: String(mpPayment.id),
          pixQrCode: pixData?.qr_code_base64 || null,
          pixCopyPaste: pixData?.qr_code || null,
        },
      });

      return updated;
    } catch (err: any) {
      // Logar erro para diagnóstico mas não expor detalhes internos
      const mpError = err?.cause?.[0]?.description || err?.message || 'unknown';
      this.logger.error(`Mercado Pago error for purchase ${purchase.id}: ${mpError}`);
      throw new BadRequestException(
        `Erro ao gerar pagamento PIX: ${mpError}. Verifique as credenciais do Mercado Pago.`,
      );
    }
  }

  async getStatus(userId: string, purchaseId: string) {
    const purchase = await this.prisma.purchase.findUnique({
      where: { id: purchaseId },
    });
    if (!purchase) throw new NotFoundException('Compra não encontrada');
    if (purchase.userId !== userId) {
      throw new BadRequestException('Compra não pertence ao usuário');
    }
    return { id: purchase.id, status: purchase.status };
  }
}
