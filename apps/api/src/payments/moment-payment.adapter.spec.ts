import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ConfigService } from "@nestjs/config";
import type { DataSource } from "typeorm";
import { createHmac } from "node:crypto";

import { MomentPaymentAdapter } from "./moment-payment.adapter";
import { Payment } from "./payment.entity";
import type { ApplicationConfig } from "../config/configuration";

describe(MomentPaymentAdapter.name, () => {
  let adapter: MomentPaymentAdapter;
  let configService: ConfigService<ApplicationConfig, true>;
  let dataSource: DataSource;
  let paymentRepository: { findOneBy: ReturnType<typeof vi.fn> };

  const secretKey = "sk_test_1234567890abcdef";
  const baseUrl = "https://api.momentpay.net";
  const webhookSecret = "whsec_MDUyYmQ2NThjZDY3NDU5NzkyYTViNjViOTlhYzI2MzE="; // base64 encoded payload

  beforeEach(() => {
    configService = {
      get: vi.fn().mockImplementation((key: string) => {
        if (key === "payments.moment") {
          return {
            secretKey,
            baseUrl,
            webhookSecret,
          };
        }
        if (key === "app.customerWebUrl") {
          return "https://customer.rscdev.tech";
        }
        return null;
      }),
    } as unknown as ConfigService<ApplicationConfig, true>;

    paymentRepository = {
      findOneBy: vi.fn(),
    };

    dataSource = {
      getRepository: vi.fn().mockReturnValue(paymentRepository),
    } as unknown as DataSource;

    adapter = new MomentPaymentAdapter(configService, dataSource);
  });

  describe("initiate", () => {
    it("should successfully build metadata with split routes and return checkout url", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => {
          await Promise.resolve();
          return {
            id: "ps_kfAWZgfQIoeG0q",
            session_url: "https://moment.momentpay.io/checkout/ckt802zEb2P2uS4Ql",
          };
        },
      } as unknown as Response);

      const result = await adapter.initiate({
        email: "customer@example.com",
        amountMinor: 361500,
        currency: "NGN",
        reference: "pmt_master_123",
        splitRoutes: [
          {
            outletId: "outlet_1",
            subaccountCode: "fafallino_423fsdz432",
            grossMinor: 22000,
            commissionMinor: 2000,
            netMinor: 20000,
          },
          {
            outletId: "outlet_2",
            subaccountCode: "kilimanjaro_42vff453",
            grossMinor: 33000,
            commissionMinor: 3000,
            netMinor: 30000,
          },
        ],
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.momentpay.net/collect/payment_sessions",
        expect.objectContaining({
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer sk_test_1234567890abcdef`,
            "Idempotency-Key": "73d5d716-1df7-2577-b975-e3d4326b0726",
          },
          body: JSON.stringify({
            amount: 361500,
            currency: "NGN",
            type: "one_time",
            external_reference: "pmt_master_123",
            metadata: {
              fafallino_423fsdz432: "20000",
              kilimanjaro_42vff453: "30000",
            },
            options: {
              checkout_options: {
                presentation_mode: { mode: "redirect" },
                return_url: "https://customer.rscdev.tech/tracking?reference=pmt_master_123",
              },
            },
          }),
        }),
      );

      expect(result).toEqual({
        gateway: "moment",
        reference: "pmt_master_123",
        checkoutUrl: "https://moment.momentpay.io/checkout/ckt802zEb2P2uS4Ql",
        status: "PENDING",
        providerResponse: {
          id: "ps_kfAWZgfQIoeG0q",
          session_url: "https://moment.momentpay.io/checkout/ckt802zEb2P2uS4Ql",
        },
      });

      fetchMock.mockRestore();
    });

    it("uses a mobile return URL when one is provided", async () => {
      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => {
          await Promise.resolve();
          return {
            id: "ps_mobile",
            session_url: "https://moment.momentpay.io/checkout/ckt_mobile",
          };
        },
      } as unknown as Response);

      await adapter.initiate({
        email: "customer@example.com",
        amountMinor: 925500,
        currency: "NGN",
        reference: "pmt_master_mobile",
        returnUrl: "rsc://payment/return",
        splitRoutes: [
          {
            outletId: "outlet_1",
            subaccountCode: "salmas_423fsdz432",
            grossMinor: 660000,
            commissionMinor: 66000,
            netMinor: 594000,
          },
        ],
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.momentpay.net/collect/payment_sessions",
        expect.objectContaining({
          body: JSON.stringify({
            amount: 925500,
            currency: "NGN",
            type: "one_time",
            external_reference: "pmt_master_mobile",
            metadata: {
              salmas_423fsdz432: "594000",
            },
            options: {
              checkout_options: {
                presentation_mode: { mode: "redirect" },
                return_url: "rsc://payment/return?reference=pmt_master_mobile",
              },
            },
          }),
        }),
      );

      fetchMock.mockRestore();
    });
  });

  describe("verify", () => {
    it("should fetch session status using session id stored in providerResponse", async () => {
      const paymentMock = Object.assign(new Payment(), {
        reference: "pmt_master_123",
        amountMinor: 50000,
        providerResponse: {
          id: "ps_kfAWZgfQIoeG0q",
        },
      });
      paymentRepository.findOneBy.mockResolvedValue(paymentMock);

      const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
        ok: true,
        json: async () => {
          await Promise.resolve();
          return {
            status: "completed",
            payment_outcome: "paid",
            amount: 50000,
          };
        },
      } as unknown as Response);

      const result = await adapter.verify("pmt_master_123");

      expect(paymentRepository.findOneBy).toHaveBeenCalledWith({ reference: "pmt_master_123" });
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.momentpay.net/collect/payment_sessions/ps_kfAWZgfQIoeG0q",
        expect.objectContaining({
          headers: {
            authorization: `Bearer sk_test_1234567890abcdef`,
          },
        }),
      );

      expect(result.status).toBe("SUCCESS");
      expect(result.amountMinor).toBe(50000);

      fetchMock.mockRestore();
    });
  });

  describe("parseWebhookEvent", () => {
    it("should successfully verify signature and parse completed payment session event", async () => {
      const payload = {
        id: "evt_test_123",
        type: "payment_session.completed",
        data: {
          external_reference: "pmt_master_123",
          payment_outcome: "paid",
          amount: 50000,
        },
      };

      const webhookId = "msg_abc123";
      const timestamp = "1720646400";
      const rawBodyStr = JSON.stringify(payload);
      const rawBody = Buffer.from(rawBodyStr, "utf8");

      // Calculate expected signature using key part
      const secretBytes = Buffer.from(webhookSecret.split("_")[1] || "", "base64");
      const signedContent = `${webhookId}.${timestamp}.${rawBodyStr}`;
      const generatedSig = createHmac("sha256", secretBytes).update(signedContent).digest("base64");

      const headers = {
        "webhook-id": webhookId,
        "webhook-timestamp": timestamp,
        "webhook-signature": `v1,${generatedSig}`,
      };

      const event = await adapter.parseWebhookEvent(rawBody, `v1,${generatedSig}`, headers);

      expect(event).not.toBeNull();
      expect(event).toEqual({
        eventId: "evt_test_123",
        eventType: "payment_session.completed",
        reference: "pmt_master_123",
        status: "SUCCESS",
        amountMinor: 50000,
        providerResponse: payload,
      });
    });

    it("should return null if signature is invalid", async () => {
      const payload = {
        id: "evt_test_123",
        type: "payment_session.completed",
        data: {
          external_reference: "pmt_master_123",
          payment_outcome: "paid",
          amount: 50000,
        },
      };

      const webhookId = "msg_abc123";
      const timestamp = "1720646400";
      const rawBody = Buffer.from(JSON.stringify(payload), "utf8");

      const headers = {
        "webhook-id": webhookId,
        "webhook-timestamp": timestamp,
        "webhook-signature": `v1,invalid_sig_here`,
      };

      const event = await adapter.parseWebhookEvent(rawBody, `v1,invalid_sig_here`, headers);

      expect(event).toBeNull();
    });
  });
});
