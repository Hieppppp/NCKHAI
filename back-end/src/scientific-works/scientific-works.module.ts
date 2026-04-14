import { Module } from '@nestjs/common';
import { ScientificWorksService } from './scientific-works.service.js';
import { ScientificWorksController } from './scientific-works.controller.js';

@Module({
  controllers: [ScientificWorksController],
  providers: [ScientificWorksService],
  exports: [ScientificWorksService],
})
export class ScientificWorksModule {}
