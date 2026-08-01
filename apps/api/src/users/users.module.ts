import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { Customer } from "../auth/customer.entity";
import { MediaModule } from "../media/media.module";
import { MasterOrder } from "../orders/master-order.entity";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AuthModule, MediaModule, TypeOrmModule.forFeature([Customer, MasterOrder])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
