import { IsString, IsOptional, IsArray, IsNumber } from 'class-validator';

export class CreateLibraryDocumentDto {
  @IsString()
  title: string;

  @IsString()
  authors: string;

  @IsString()
  @IsOptional()
  abstract?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  type: string;

  @IsString()
  @IsOptional()
  level?: string;

  @IsNumber()
  @IsOptional()
  aiScore?: number;

  @IsNumber()
  @IsOptional()
  publicationId?: number;

  @IsNumber()
  @IsOptional()
  workId?: number;
}

export class UpdateLibraryDocumentDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  authors?: string;

  @IsString()
  @IsOptional()
  abstract?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  keywords?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  aiScore?: number;
}
