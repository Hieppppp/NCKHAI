import { Module } from '@nestjs/common';
import { TextbooksService } from './textbooks.service.js';
import { TextbooksController } from './textbooks.controller.js';

@Module({
  controllers: [TextbooksController],
  providers: [TextbooksService],
  exports: [TextbooksService],
})
export class TextbooksModule {}
