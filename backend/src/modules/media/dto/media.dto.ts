import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';
import type { media_folder } from '@prisma/client';
import { MEDIA_FOLDERS } from '../admin-media.service';

/** The server owns folder taxonomy — clients may only pick one of these. */
export class MediaFolderDto {
  @IsOptional()
  @IsIn(MEDIA_FOLDERS as unknown as string[])
  folder?: media_folder;
}

export class ListMediaQueryDto {
  @IsOptional()
  @IsIn(MEDIA_FOLDERS as unknown as string[])
  folder?: media_folder;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page?: number;
}
