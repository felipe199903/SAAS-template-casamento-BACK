import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CreatePresentDto, UpdatePresentStatusDto } from './dto/present.dto';
import { PresentsService } from './presents.service';

@Controller()
export class PresentsController {
  constructor(private presentsService: PresentsService) {}

  // Público: convidados consultam presentes pelo slug do casamento
  @Public()
  @Get('weddings/:slug/presents')
  findByWedding(@Param('slug') slug: string) {
    return this.presentsService.findByWedding(slug);
  }

  // Autenticado: casal gerencia presentes
  @UseGuards(JwtAuthGuard)
  @Post('weddings/:weddingId/presents')
  create(
    @CurrentUser() user: any,
    @Param('weddingId') weddingId: string,
    @Body() dto: CreatePresentDto,
  ) {
    return this.presentsService.create(user.id, weddingId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('presents/:id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePresentDto>,
  ) {
    return this.presentsService.update(user.id, id, dto);
  }

  // Público: convidado confirma presente
  @Public()
  @Patch('presents/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePresentStatusDto,
  ) {
    return this.presentsService.updateStatus(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('presents/:id')
  remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.presentsService.remove(user.id, id);
  }
}
