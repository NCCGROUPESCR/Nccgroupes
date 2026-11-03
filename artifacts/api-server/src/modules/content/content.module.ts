import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Page } from './entities/page.entity';
import { BlogPost } from './entities/blog-post.entity';
import { StaffMember } from './entities/staff-member.entity';
import { ContactInfo } from './entities/contact-info.entity';
import { ContactMessage } from './entities/contact-message.entity';
import { LegalDocument } from './entities/legal-document.entity';
import { LegalDocumentRevision } from './entities/legal-document-revision.entity';
import { DocCategory } from './entities/doc-category.entity';
import { DocArticle } from './entities/doc-article.entity';
import { DocVersion } from './entities/doc-version.entity';

import { PagesService } from './pages.service';
import { BlogService } from './blog.service';
import { StaffService } from './staff.service';
import { ContactService } from './contact.service';
import { LegalService } from './legal.service';
import { DocCategoryService } from './doc-category.service';
import { DocArticleService } from './doc-article.service';

import { ContentController } from './content.controller';
import { AdminContentController } from './admin-content.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Page,
      BlogPost,
      StaffMember,
      ContactInfo,
      ContactMessage,
      LegalDocument,
      LegalDocumentRevision,
      DocCategory,
      DocArticle,
      DocVersion,
    ]),
  ],
  providers: [PagesService, BlogService, StaffService, ContactService, LegalService, DocCategoryService, DocArticleService],
  controllers: [ContentController, AdminContentController],
  exports: [PagesService, BlogService, StaffService, ContactService, LegalService, DocCategoryService, DocArticleService],
})
export class ContentModule {}
