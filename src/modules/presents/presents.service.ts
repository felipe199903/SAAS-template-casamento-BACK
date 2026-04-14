import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePresentDto, UpdatePresentStatusDto } from './dto/present.dto';

@Injectable()
export class PresentsService {
  constructor(private prisma: PrismaService) {}

  async findByWedding(slug: string) {
    const wedding = await this.prisma.wedding.findUnique({ where: { slug } });
    if (!wedding) throw new NotFoundException('Casamento não encontrado');
    return this.prisma.present.findMany({
      where: { weddingId: wedding.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, weddingId: string, dto: CreatePresentDto) {
    await this.assertWeddingOwner(userId, weddingId);
    return this.prisma.present.create({
      data: {
        weddingId,
        name: dto.name,
        price: dto.price,
        imageUrl: dto.imageUrl,
        description: dto.description,
        isCustomValue: dto.isCustomValue ?? false,
        minValue: dto.minValue ?? null,
      },
    });
  }

  async update(
    userId: string,
    presentId: string,
    dto: Partial<CreatePresentDto>,
  ) {
    const present = await this.prisma.present.findUnique({
      where: { id: presentId },
    });
    if (!present) throw new NotFoundException('Presente não encontrado');
    await this.assertWeddingOwner(userId, present.weddingId);
    return this.prisma.present.update({
      where: { id: presentId },
      data: dto,
    });
  }

  async updateStatus(presentId: string, dto: UpdatePresentStatusDto) {
    const present = await this.prisma.present.findUnique({
      where: { id: presentId },
    });
    if (!present) throw new NotFoundException('Presente não encontrado');
    return this.prisma.present.update({
      where: { id: presentId },
      data: { status: dto.status },
    });
  }

  async remove(userId: string, presentId: string) {
    const present = await this.prisma.present.findUnique({
      where: { id: presentId },
    });
    if (!present) throw new NotFoundException('Presente não encontrado');
    await this.assertWeddingOwner(userId, present.weddingId);
    return this.prisma.present.delete({ where: { id: presentId } });
  }

  private async assertWeddingOwner(userId: string, weddingId: string) {
    const wedding = await this.prisma.wedding.findUnique({
      where: { id: weddingId },
    });
    if (!wedding) throw new NotFoundException('Casamento não encontrado');
    if (wedding.userId !== userId) throw new ForbiddenException();
    return wedding;
  }
}
