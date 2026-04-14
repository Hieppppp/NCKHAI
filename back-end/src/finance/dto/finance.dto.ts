import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';

export class CreateBudgetDto {
  @IsString()
  name: string;

  @IsNumber()
  totalAmount: number;

  @IsNumber()
  fiscalYear: number;

  @IsString()
  @IsOptional()
  department?: string;
}

export class CreateTransactionDto {
  @IsNumber()
  amount: number;

  @IsString()
  type: string; // ALLOCATION, DISBURSEMENT, REFUND

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  budgetId: number;

  @IsNumber()
  @IsOptional()
  workId?: number;
}

export class UpdateTransactionStatusDto {
  @IsString()
  status: string; // APPROVED, REJECTED, COMPLETED
}

export class CreateRewardDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  type: string; // CASH, CERTIFICATE, LETTER

  @IsNumber()
  @IsOptional()
  amount?: number;

  @IsString()
  @IsOptional()
  period?: string;

  @IsNumber()
  userId: number;

  @IsNumber()
  @IsOptional()
  workId?: number;
}

export class UpdateRewardStatusDto {
  @IsString()
  status: string; // APPROVED, AWARDED
}
