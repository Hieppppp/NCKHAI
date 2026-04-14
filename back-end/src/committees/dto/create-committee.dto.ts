import { IsString, IsOptional, IsInt, IsNumber, IsArray, IsDateString } from 'class-validator';

export class CreateCommitteeDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  workId: number;

  @IsDateString()
  @IsOptional()
  meetingDate?: string;

  @IsString()
  @IsOptional()
  location?: string;

  @IsArray()
  members: { userId: number; role: string }[];
}

export class SubmitReviewDto {
  @IsInt()
  workId: number;

  @IsInt()
  @IsOptional()
  committeeId?: number;

  @IsNumber()
  innovationScore: number;     // 0-40

  @IsNumber()
  feasibilityScore: number;    // 0-30

  @IsNumber()
  impactScore: number;         // 0-30

  @IsString()
  @IsOptional()
  comment?: string;

  @IsString()
  @IsOptional()
  recommendation?: string;    // accept, revise, reject
}
