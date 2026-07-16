import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean } from "class-validator";

export class UpdateRiderAvailabilityDto {
  @ApiProperty({
    example: true,
    description: "Set true to accept new assignments; false to stop receiving new assignments.",
  })
  @IsBoolean()
  isAvailable!: boolean;
}
