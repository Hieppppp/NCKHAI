import { Module } from '@nestjs/common';
import { PublicationsService } from './publications.service.js';
import { PublicationsController } from './publications.controller.js';

@Module({
  controllers: [PublicationsController],
  providers: [PublicationsService],
  exports: [PublicationsService],
})
export class PublicationsModule {}
