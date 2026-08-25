import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @IsOptional()
  @IsString()
  @MaxLength(140)
  title?: string;

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  body!: string;
}

export class ModerateReviewDto {
  @IsIn(['approved', 'rejected'])
  status!: 'approved' | 'rejected';
}
