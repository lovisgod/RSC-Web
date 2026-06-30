import { BadRequestException, Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { v2 as cloudinary } from "cloudinary";

import type { ApplicationConfig } from "../config/configuration";

export interface UploadedImageFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface UploadImageInput {
  file: UploadedImageFile;
  folder: string;
  publicIdPrefix?: string;
}

export interface UploadedImageResult {
  url: string;
  publicId: string;
}

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxImageSizeBytes = 5 * 1024 * 1024;

@Injectable()
export class MediaService {
  private readonly provider: ApplicationConfig["media"]["provider"];
  private readonly rootFolder: string;

  constructor(configService: ConfigService<ApplicationConfig, true>) {
    const media = configService.get("media", { infer: true });

    this.provider = media.provider;
    this.rootFolder = media.cloudinary.folder;

    if (this.provider === "cloudinary") {
      cloudinary.config({
        cloud_name: media.cloudinary.cloudName,
        api_key: media.cloudinary.apiKey,
        api_secret: media.cloudinary.apiSecret,
      });
    }
  }

  async uploadImage(input: UploadImageInput): Promise<UploadedImageResult> {
    this.validateImage(input.file);

    if (this.provider !== "cloudinary") {
      throw new ServiceUnavailableException("Image upload provider is not configured");
    }

    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        const uploadOptions = {
          folder: `${this.rootFolder}/${input.folder}`,
          ...(input.publicIdPrefix ? { public_id: input.publicIdPrefix } : {}),
          overwrite: true,
          resource_type: "image" as const,
        };
        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error || !result?.secure_url || !result.public_id) {
            reject(error instanceof Error ? error : new Error("Cloudinary upload failed"));
            return;
          }

          resolve({ secure_url: result.secure_url, public_id: result.public_id });
        });

        stream.end(input.file.buffer);
      },
    );

    return { url: result.secure_url, publicId: result.public_id };
  }

  private validateImage(file: UploadedImageFile | undefined): asserts file is UploadedImageFile {
    if (!file) {
      throw new BadRequestException("Image file is required");
    }

    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException("Only JPEG, PNG, WEBP, and GIF images are supported");
    }

    if (file.size > maxImageSizeBytes) {
      throw new BadRequestException("Image file must not exceed 5MB");
    }
  }
}
