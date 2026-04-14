import { IsString, IsOptional, IsEnum, IsArray, IsNumber } from 'class-validator';

export class CreateWorkDto {
  @IsString()
  title: string;

  @IsString()
  authors: string;

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
