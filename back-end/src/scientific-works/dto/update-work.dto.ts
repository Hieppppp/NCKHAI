import { IsString, IsOptional, IsEnum, IsArray, IsNumber } from 'class-validator';

export class UpdateWorkDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  authors?: string;

  @IsString()
  @IsOptional()
  abstract?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];

  @IsEnum(['JOURNAL_ARTICLE', 'CONFERENCE_PAPER', 'RESEARCH_PROJECT', 'PATENT', 'TEXTBOOK', 'THESIS'])
  @IsOptional()
  type?: string;

  @IsEnum(['UNIVERSITY', 'MINISTRY', 'STATE'])
  @IsOptional()
  level?: string;

  @IsEnum(['DRAFT', 'SUBMITTED', 'OUTLINE_REVIEW', 'PROPOSAL_REVIEW', 'IN_PROGRESS', 'REVIEW', 'REVISION', 'ACCEPTED', 'REJECTED', 'ARCHIVED'])
  @IsOptional()
  status?: string;

  @IsNumber()
  @IsOptional()
  budget?: number;

  @IsString()
  @IsOptional()
  journalName?: string;

  @IsString()
  @IsOptional()
  issn?: string;

  @IsString()
  @IsOptional()
  doi?: string;
}
