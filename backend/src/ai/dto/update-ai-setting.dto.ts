import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateAiSettingDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  dailyRequestLimit?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  perUserDailyLimit?: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100000)
  monthlyBudgetUsd?: number;
}
