import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateWeddingDto,
  PublishWeddingDto,
  UpdatePixDto,
  UpdateWeddingDto,
} from './dto/wedding.dto';

@Injectable()
export class WeddingsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateWeddingDto) {
    const slug = await this.generateSlug(dto.groomName, dto.brideName);
    return this.prisma.wedding.create({
      data: {
        userId,
        groomName: dto.groomName,
        brideName: dto.brideName,
        city: dto.city ?? 'SAO PAULO',
        slug,
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.wedding.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBySlug(slug: string) {
    const wedding = await this.prisma.wedding.findUnique({ where: { slug } });
    if (!wedding) throw new NotFoundException('Casamento não encontrado');
    return wedding;
  }

  async updatePix(userId: string, weddingId: string, dto: UpdatePixDto) {
    const wedding = await this.assertOwner(userId, weddingId);
    if (!wedding.paid) {
      throw new BadRequestException(
        'Site precisa estar pago para configurar PIX',
      );
    }
    this.validatePixKey(dto.pixKey, dto.pixKeyType);
    return this.prisma.wedding.update({
      where: { id: weddingId },
      data: { pixKey: dto.pixKey, pixKeyType: dto.pixKeyType },
    });
  }

  async updateWedding(userId: string, weddingId: string, dto: UpdateWeddingDto) {
    await this.assertOwner(userId, weddingId);
    return this.prisma.wedding.update({
      where: { id: weddingId },
      data: dto,
    });
  }

  async setPublished(
    userId: string,
    weddingId: string,
    dto: PublishWeddingDto,
  ) {
    const wedding = await this.assertOwner(userId, weddingId);
    if (!wedding.paid && dto.published) {
      throw new BadRequestException(
        'Site precisa estar pago para ser publicado',
      );
    }
    return this.prisma.wedding.update({
      where: { id: weddingId },
      data: { published: dto.published },
    });
  }

  private async assertOwner(userId: string, weddingId: string) {
    const wedding = await this.prisma.wedding.findUnique({
      where: { id: weddingId },
    });
    if (!wedding) throw new NotFoundException('Casamento não encontrado');
    if (wedding.userId !== userId) throw new ForbiddenException();
    return wedding;
  }

  private async generateSlug(groomName: string, brideName: string): Promise<string> {
    const base = `${groomName}-${brideName}`
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60);

    let slug = base;
    let attempt = 0;
    while (await this.prisma.wedding.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${base}-${attempt}`;
    }
    return slug;
  }

  private validatePixKey(key: string, type: string) {
    if (type === 'cpf' && !/^\d{11}$/.test(key.replace(/\D/g, ''))) {
      throw new BadRequestException('CPF inválido');
    }
    if (type === 'email' && !key.includes('@')) {
      throw new BadRequestException('E-mail inválido');
    }
    if (type === 'phone' && !/^\d{10,11}$/.test(key.replace(/\D/g, ''))) {
      throw new BadRequestException('Telefone inválido');
    }
  }
}
