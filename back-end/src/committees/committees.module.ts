import { Module } from '@nestjs/common';
import { CommitteesService } from './committees.service.js';
import { CommitteesController } from './committees.controller.js';

@Module({
  controllers: [CommitteesController],
  providers: [CommitteesService],
  exports: [CommitteesService],
})
export class CommitteesModule {}
