import { IsUUID, IsInt } from 'class-validator';

export class ReorderDirectoriesDto {
  @IsUUID()
  directoryId: string;

  @IsInt()
  displayOrder: number;
}

export class TrackDirectoryInteractionDto {
  interactionType: 'view' | 'preview_click' | 'open_click';
  ipAddress?: string;
  userAgent?: string;
}
