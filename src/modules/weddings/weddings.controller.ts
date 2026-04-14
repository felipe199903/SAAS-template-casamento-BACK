import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import {
  CreateWeddingDto,
  PublishWeddingDto,
  UpdatePixDto,
  UpdateWeddingDto,
} from './dto/wedding.dto';
import { WeddingsService } from './weddings.service';

@UseGuards(JwtAuthGuard)
@Controller('weddings')
export class WeddingsController {
  constructor(private weddingsService: WeddingsService) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateWeddingDto) {
    return this.weddingsService.create(user.id, dto);
  }

  @Get('my')
  findMine(@CurrentUser() user: any) {
    return this.weddingsService.findMine(user.id);
  }

  @Public()
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.weddingsService.findBySlug(slug);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateWeddingDto,
  ) {
    return this.weddingsService.updateWedding(user.id, id, dto);
  }

  @Patch(':id/pix')
  updatePix(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdatePixDto,
  ) {
    return this.weddingsService.updatePix(user.id, id, dto);
  }

  @Patch(':id/publish')
  setPublished(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: PublishWeddingDto,
  ) {
    return this.weddingsService.setPublished(user.id, id, dto);
  }
}
