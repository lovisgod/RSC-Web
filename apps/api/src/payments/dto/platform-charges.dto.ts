import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class UpdatePlatformChargesDto {
  @ApiPropertyOptional({ example: 1000, description: "1000 = 10%" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  platformCommissionBps?: number;

  @ApiPropertyOptional({ example: 750, description: "750 = 7.5%" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(10_000)
  defaultVatBps?: number;

  @ApiPropertyOptional({ example: 150000, description: "Minor currency unit, e.g. kobo" })
  @IsOptional()
  @IsInt()
  @Min(0)
  deliveryFeeMinor?: number;

  @ApiPropertyOptional({ example: 0, description: "Minor currency unit, e.g. kobo" })
  @IsOptional()
  @IsInt()
  @Min(0)
  serviceFeeMinor?: number;
}
