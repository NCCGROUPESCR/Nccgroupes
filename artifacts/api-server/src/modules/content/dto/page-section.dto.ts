import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PageSectionDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(0)
  order: number;

  @IsString()
  heading: string;

  @IsString()
  body: string;

  @IsOptional()
  @IsString()
  imageUrl?: string | null;
}
