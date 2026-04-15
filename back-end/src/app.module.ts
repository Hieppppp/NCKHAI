import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { ScientificWorksModule } from './scientific-works/scientific-works.module.js';
import { AiModule } from './ai/ai.module.js';
import { CommitteesModule } from './committees/committees.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { PublicationsModule } from './publications/publications.module.js';
import { LibraryModule } from './library/library.module.js';
import { FinanceModule } from './finance/finance.module.js';
import { ResearchHoursModule } from './research-hours/research-hours.module.js';
import { SettingsModule } from './settings/settings.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    ScientificWorksModule,
    AiModule,
    CommitteesModule,
    NotificationsModule,
    DashboardModule,
    PublicationsModule,
    LibraryModule,
    FinanceModule,
    ResearchHoursModule,
    SettingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
