export interface PushNotificationInput {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushSender {
  send(input: PushNotificationInput): Promise<void>;
}

export const PUSH_SENDER = Symbol("PUSH_SENDER");
