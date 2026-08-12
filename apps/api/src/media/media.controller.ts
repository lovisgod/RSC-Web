import { Controller, Post, UploadedFile, UseGuards, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";

import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { UserRole } from "../auth/user-role.enum";
import { ApiMessage } from "../common/http/api-message.decorator";
import { RateLimit } from "../common/rate-limit/rate-limit.decorator";
import { MediaService, type UploadedImageFile } from "./media.service";

@ApiTags("Media")
@ApiBearerAuth()
@UseGuards(AuthGuard, RolesGuard)
@Controller({ path: "media", version: "1" })
export class MediaController {
  constructor(private readonly media: MediaService) {}

  @Post("images")
  @RateLimit({ limit: 20, windowSeconds: 600 })
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["file"],
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiOperation({
    summary: "Upload an image",
    description:
      "Uploads an image to the configured media provider and returns the hosted URL. Admin clients can use the returned url when creating or updating menu items, outlets, and other records that accept imageUrl.",
  })
  @ApiCreatedResponse({
    description: "Image uploaded successfully",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "object",
          properties: {
            url: { type: "string", format: "uri" },
            publicId: { type: "string" },
          },
        },
        message: { type: "string", example: "Image uploaded successfully" },
        status: { type: "number", example: 201 },
      },
    },
  })
  @ApiBadRequestResponse({ description: "File is missing, unsupported, or larger than 5MB" })
  @ApiServiceUnavailableResponse({ description: "Image upload provider is not configured" })
  @ApiMessage("Image uploaded successfully")
  uploadImage(@UploadedFile() file: UploadedImageFile) {
    return this.media.uploadImage({
      file,
      folder: "uploads",
    });
  }
}
