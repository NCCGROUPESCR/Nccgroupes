import { IsArray, IsString } from 'class-validator';

export class ReorderStaffDto {
  /** Staff member ids in the desired display order. */
  @IsArray()
  @IsString({ each: true })
  order: string[];
}
