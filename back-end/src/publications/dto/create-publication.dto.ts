import { IsString, IsOptional, IsArray, IsNumber, IsEnum } from 'class-validator';

export class CreatePublicationDto {
  @IsString()
  title: string;

  @IsString()
  authors: string;

  @IsString()
  @IsOptional()
  abstract?: string;

  @IsString()
  @IsOptional()
  journalName?: string;

  @IsString()
  @IsOptional()
  conferenceName?: string;

  @IsString()
  @IsOptional()
  publishedDate?: string;

  @IsString()
  @IsOptional()
  doi?: string;

  @IsString()
  @IsOptional()
  issn?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];

  @IsNumber()
  @IsOptional()
  confidence?: number;

  @IsNumber()
  @IsOptional()
  fileId?: number;

  @IsNumber()
  @IsOptional()
  workId?: number;
}

export class UpdatePublicationDto {
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
  journalName?: string;

  @IsString()
  @IsOptional()
  conferenceName?: string;

  @IsString()
  @IsOptional()
  publishedDate?: string;

  @IsString()
  @IsOptional()
  doi?: string;

  @IsString()
  @IsOptional()
  issn?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];

  @IsString()
  @IsOptional()
  status?: string;
}
