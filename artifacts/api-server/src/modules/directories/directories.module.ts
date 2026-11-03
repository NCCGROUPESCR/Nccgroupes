import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Directory, DirectoryCategory, DirectoryInteraction } from './entities';
import { DirectoriesService } from './directories.service';
import { DirectoriesController } from './directories.controller';
import { AdminDirectoriesController } from './admin-directories.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Directory, DirectoryCategory, DirectoryInteraction])],
  providers: [DirectoriesService],
  controllers: [DirectoriesController, AdminDirectoriesController],
  exports: [DirectoriesService],
})
export class DirectoriesModule {}
