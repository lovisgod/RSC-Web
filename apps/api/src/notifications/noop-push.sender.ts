import { Injectable, Logger } from "@nestjs/common";

import type { PushNotificationInput, PushSender } from "./push-sender";

@Injectable()
export class NoopPushSender implements PushSender {
  private readonly logger = new Logger(NoopPushSender.name);

  send(input: PushNotificationInput): Promise<void> {
    this.logger.debug(
      `Skipping push notification: ${JSON.stringify({
        tokenSet: input.token.length > 0,
        title: input.title,
      })}`,
    );

    return Promise.resolve();
  }
}
