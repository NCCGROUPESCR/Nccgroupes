import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaffMember } from './entities/staff-member.entity';
import { CreateStaffMemberDto } from './dto/create-staff-member.dto';
import { UpdateStaffMemberDto } from './dto/update-staff-member.dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(StaffMember)
    private readonly repo: Repository<StaffMember>,
  ) {}

  findAll(): Promise<StaffMember[]> {
    return this.repo.find({ order: { displayOrder: 'ASC', createdAt: 'ASC' } });
  }

  async findOne(id: string): Promise<StaffMember> {
    const member = await this.repo.findOne({ where: { id } });
    if (!member) throw new NotFoundException('Staff member not found.');
    return member;
  }

  async create(dto: CreateStaffMemberDto): Promise<StaffMember> {
    if (dto.displayOrder === undefined) {
      const count = await this.repo.count();
      dto = { ...dto, displayOrder: count };
    }
    return this.repo.save(this.repo.create(dto));
  }

  async update(id: string, dto: UpdateStaffMemberDto): Promise<StaffMember> {
    const member = await this.findOne(id);
    Object.assign(member, dto);
    return this.repo.save(member);
  }

  async remove(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async reorder(order: string[]): Promise<StaffMember[]> {
    const members = await this.repo.findByIds(order);
    const byId = new Map(members.map((m) => [m.id, m]));
    const updated: StaffMember[] = [];
    order.forEach((id, index) => {
      const member = byId.get(id);
      if (member) {
        member.displayOrder = index;
        updated.push(member);
      }
    });
    await this.repo.save(updated);
    return this.findAll();
  }
}
