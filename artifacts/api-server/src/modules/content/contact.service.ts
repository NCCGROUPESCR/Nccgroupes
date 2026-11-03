import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContactInfo } from './entities/contact-info.entity';
import { ContactMessage, ContactMessageStatus } from './entities/contact-message.entity';
import { UpdateContactInfoDto } from './dto/update-contact-info.dto';
import { CreateContactMessageDto } from './dto/create-contact-message.dto';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactInfo)
    private readonly infoRepo: Repository<ContactInfo>,
    @InjectRepository(ContactMessage)
    private readonly messageRepo: Repository<ContactMessage>,
  ) {}

  /** There is always exactly one contact info row — created lazily if missing. */
  async getInfo(): Promise<ContactInfo> {
    let info = await this.infoRepo.findOne({ where: {} });
    if (!info) {
      info = await this.infoRepo.save(this.infoRepo.create({}));
    }
    return info;
  }

  async updateInfo(dto: UpdateContactInfoDto): Promise<ContactInfo> {
    const info = await this.getInfo();
    Object.assign(info, dto);
    return this.infoRepo.save(info);
  }

  submitMessage(dto: CreateContactMessageDto): Promise<ContactMessage> {
    return this.messageRepo.save(this.messageRepo.create(dto));
  }

  findMessages(status?: ContactMessageStatus): Promise<ContactMessage[]> {
    const where = status ? { status } : {};
    return this.messageRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async updateMessageStatus(id: string, status: ContactMessageStatus): Promise<ContactMessage> {
    const message = await this.messageRepo.findOne({ where: { id } });
    if (!message) throw new NotFoundException('Message not found.');
    message.status = status;
    return this.messageRepo.save(message);
  }
}
