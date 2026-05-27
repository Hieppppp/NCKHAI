import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';

const PATENT_TYPES = ['INVENTION', 'UTILITY_SOLUTION', 'INDUSTRIAL_DESIGN'] as const;
const PATENT_STATUSES = ['DRAFT', 'FILED', 'EXAMINING', 'GRANTED', 'REJECTED'] as const;

export class CreatePatentDto {
  @IsString() title: string;
  @IsString() inventors: string;

  @IsString() @IsOptional() owner?: string;
  @IsString() @IsOptional() abstract?: string;
  @IsEnum(PATENT_TYPES) @IsOptional() patentType?: string;
  @IsString() @IsOptional() applicationNo?: string;
  @IsString() @IsOptional() patentNo?: string;
  @IsString() @IsOptional() issuingAuthority?: string;
  @IsString() @IsOptional() ipcClass?: string;
  @IsString() @IsOptional() field?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() keywords?: string[];
  @IsString() @IsOptional() filingDate?: string;
  @IsString() @IsOptional() grantDate?: string;
}

export class UpdatePatentDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() inventors?: string;
  @IsString() @IsOptional() owner?: string;
  @IsString() @IsOptional() abstract?: string;
  @IsEnum(PATENT_TYPES) @IsOptional() patentType?: string;
  @IsString() @IsOptional() applicationNo?: string;
  @IsString() @IsOptional() patentNo?: string;
  @IsString() @IsOptional() issuingAuthority?: string;
  @IsString() @IsOptional() ipcClass?: string;
  @IsString() @IsOptional() field?: string;
  @IsArray() @IsString({ each: true }) @IsOptional() keywords?: string[];
  @IsString() @IsOptional() filingDate?: string;
  @IsString() @IsOptional() grantDate?: string;
  @IsEnum(PATENT_STATUSES) @IsOptional() status?: string;
}
