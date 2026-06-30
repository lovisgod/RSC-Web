import { Body, Controller, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import type { AuthenticatedRequest } from "../auth/auth-request";
import { AuthGuard } from "../auth/auth.guard";
import { ApiMessage } from "../common/http/api-message.decorator";
import { InitiatePaymentDto } from "./dto/payment.dto";
import { PaymentsService } from "./payments.service";

@ApiTags("Payments")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller({ path: "payments", version: "1" })
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post("initiate")
  @ApiMessage("Payment initiated successfully")
  initiate(@Req() request: AuthenticatedRequest, @Body() input: InitiatePaymentDto) {
    return this.payments.initiate(request.user!, input);
  }
}
