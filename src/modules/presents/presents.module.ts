import { Module } from '@nestjs/common';
import { PresentsController } from './presents.controller';
import { PresentsService } from './presents.service';

@Module({
  controllers: [PresentsController],
  providers: [PresentsService],
})
export class PresentsModule {}
