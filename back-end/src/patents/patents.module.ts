import { Module } from '@nestjs/common';
import { PatentsService } from './patents.service.js';
import { PatentsController } from './patents.controller.js';

@Module({
  controllers: [PatentsController],
  providers: [PatentsService],
  exports: [PatentsService],
})
export class PatentsModule {}
