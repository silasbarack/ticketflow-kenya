import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class AlertDecisionDto {
  @IsIn(['ACKNOWLEDGED', 'RESOLVED', 'DISMISSED'])
  decision!: 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED';

  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  note!: string;
}
