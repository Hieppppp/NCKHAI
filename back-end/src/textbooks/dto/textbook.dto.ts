import { IsString, IsOptional, IsArray, IsEnum, IsInt } from 'class-validator';

const MATERIAL_TYPES = ['TEXTBOOK', 'LECTURE', 'REFERENCE', 'MONOGRAPH'] as const;
const TEXTBOOK_STATUSES = ['DRAFT', 'SUBMITTED', 'REVIEWING', 'APPROVED', 'PUBLISHED', 'REJECTED'] as const;
const LEVELS = ['UNIVERSITY', 'MINISTRY', 'STATE'] as const;

export class CreateTextbookDto {
  @IsString() title: string;
  @IsString() authors: string;

  @IsString() @IsOptional() abstract?: string;
  @IsEnum(MATERIAL_TYPES) @IsOptional() materialType?: string;
  @IsString() @IsOptional() publisher?: string;
  @IsString() @IsOptional() isbn?: string;
  @IsInt() @IsOptional() publishYear?: number;
  @IsString() @IsOptional() edition?: string;
  @IsInt() @IsOptional() pages?: number;
  @IsString() @IsOptional() subject?: string;
  @IsString() @IsOptional() field?: string;
  @IsEnum(LEVELS) @IsOptional() approvalLevel?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() keywords?: string[];
}

export class UpdateTextbookDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() authors?: string;
  @IsString() @IsOptional() abstract?: string;
  @IsEnum(MATERIAL_TYPES) @IsOptional() materialType?: string;
  @IsString() @IsOptional() publisher?: string;
  @IsString() @IsOptional() isbn?: string;
  @IsInt() @IsOptional() publishYear?: number;
  @IsString() @IsOptional() edition?: string;
  @IsInt() @IsOptional() pages?: number;
  @IsString() @IsOptional() subject?: string;
  @IsString() @IsOptional() field?: string;
  @IsEnum(LEVELS) @IsOptional() approvalLevel?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() keywords?: string[];
  @IsEnum(TEXTBOOK_STATUSES) @IsOptional() status?: string;
}
