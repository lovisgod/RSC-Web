import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { AuthModule } from "../auth/auth.module";
import { Customer } from "../auth/customer.entity";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([Customer])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
