import { Injectable, NotFoundException } from '@nestjs/common';
import { PurchaseStatus, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [totalUsers, totalWeddings, paidWeddings, totalPurchases, totalRevenue] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.wedding.count(),
        this.prisma.wedding.count({ where: { paid: true } }),
        this.prisma.purchase.count({ where: { status: 'PAID' } }),
        this.prisma.purchase.aggregate({
          _sum: { amount: true },
          where: { status: 'PAID' },
        }),
      ]);

    return {
      totalUsers,
      totalWeddings,
      paidWeddings,
      pendingWeddings: totalWeddings - paidWeddings,
      totalPurchases,
      totalRevenue: Number(totalRevenue._sum.amount ?? 0),
    };
  }

  async listWeddings(opts: { paid?: boolean; page: number; limit: number }) {
    const skip = (opts.page - 1) * opts.limit;
    const where = opts.paid !== undefined ? { paid: opts.paid } : {};
    const [items, total] = await Promise.all([
      this.prisma.wedding.findMany({
        where,
        skip,
        take: opts.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true } } },
      }),
      this.prisma.wedding.count({ where }),
    ]);
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async listPurchases(opts: {
    status?: PurchaseStatus;
    page: number;
    limit: number;
  }) {
    const skip = (opts.page - 1) * opts.limit;
    const where = opts.status ? { status: opts.status } : {};
    const [items, total] = await Promise.all([
      this.prisma.purchase.findMany({
        where,
        skip,
        take: opts.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { email: true } },
          wedding: { select: { groomName: true, brideName: true, slug: true } },
        },
      }),
      this.prisma.purchase.count({ where }),
    ]);
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async listUsers(opts: { page: number; limit: number }) {
    const skip = (opts.page - 1) * opts.limit;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: opts.limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          role: true,
          createdAt: true,
          _count: { select: { weddings: true } },
        },
      }),
      this.prisma.user.count(),
    ]);
    return { items, total, page: opts.page, limit: opts.limit };
  }

  async updateUserRole(userId: string, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true },
    });
  }

  async deleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    await this.prisma.user.delete({ where: { id: userId } });
    return { message: 'Usuário removido com sucesso' };
  }

  async deleteWedding(weddingId: string) {
    const wedding = await this.prisma.wedding.findUnique({ where: { id: weddingId } });
    if (!wedding) throw new NotFoundException('Site não encontrado');

    const purchases = await this.prisma.purchase.findMany({
      where: { weddingId },
      select: { id: true },
    });
    const purchaseIds = purchases.map((p) => p.id);

    await this.prisma.$transaction(async (tx) => {
      if (purchaseIds.length > 0) {
        await tx.payment.deleteMany({ where: { purchaseId: { in: purchaseIds } } });
      }
      await tx.purchase.deleteMany({ where: { weddingId } });
      await tx.present.deleteMany({ where: { weddingId } });
      await tx.wedding.delete({ where: { id: weddingId } });
    });

    return { message: 'Site removido com sucesso' };
  }
}
