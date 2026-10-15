import type { DataSource, Repository } from "typeorm";
import { describe, expect, it, vi } from "vitest";

import type { Outlet } from "../outlets/outlet.entity";
import { FinanceService, settlementRowsToCsv } from "./finance.service";

describe("FinanceService outlet settlement matrix", () => {
  it("uses successful payment time for visibility while blocking unfinished payouts", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
        outletName: "Salmas Grill",
        imageUrl: null,
        subaccountCode: "SALMAS_001",
        completedSubOrders: "2",
        pendingSubOrders: "2",
        fulfillmentPendingSubOrders: "2",
        grossMinor: "1400",
        commissionMinor: "70",
        netMinor: "1330",
        currency: "NGN",
        latestApprovedAt: null,
      },
    ]);
    const service = new FinanceService(
      { query } as unknown as DataSource,
      {} as Repository<Outlet>,
    );

    const [summary] = await service.outletSettlements({
      dateFrom: "2026-10-12",
      dateTo: "2026-10-12",
    });

    expect(query.mock.calls[0]?.[0]).toContain("payment.succeeded_at");
    expect(summary).toMatchObject({
      completedSubOrders: 2,
      fulfillmentPendingSubOrders: 2,
      grossMinor: 1400,
      status: "PENDING",
      approvalAvailable: false,
      approvalUnavailableReason: "2 paid sub-order(s) are awaiting fulfillment",
    });
  });
});

describe("settlementRowsToCsv", () => {
  it("exports app settlement rows with explicit minor-unit columns", () => {
    const csv = settlementRowsToCsv([
      {
        settlementDate: "2026-10-14",
        outletId: "4273e96c-2887-49a5-a6d5-269f007f04f0",
        outletName: "Cactus, Lagos",
        subaccountCode: "CACTUS_001",
        subOrderId: "67b9f6ce-b162-4387-86a8-e777f44c64ec",
        masterOrderId: "ee4a20eb-214c-458b-bfab-d7633d2d44d2",
        paymentReference: "RSC-reference",
        paymentGateway: "moment",
        completedAt: "2026-10-14T13:00:00.000Z",
        grossMinor: "2181875",
        commissionMinor: 86750,
        netMinor: 2095125,
        currency: "NGN",
        payoutStatus: "APPROVED",
        approvedAt: "2026-10-15T08:00:00.000Z",
      },
    ]);

    expect(csv.split("\n")[0]).toContain("gross_minor,commission_minor,net_minor");
    expect(csv).toContain('"Cactus, Lagos"');
    expect(csv).toContain("2181875,86750,2095125,NGN,APPROVED");
  });

  it("keeps an empty export useful and prevents spreadsheet formula execution", () => {
    expect(settlementRowsToCsv([])).toMatch(/^settlement_date,/);

    const csv = settlementRowsToCsv([
      {
        settlementDate: "2026-10-14",
        outletId: "outlet-id",
        outletName: '=HYPERLINK("https://example.test")',
        subaccountCode: null,
        subOrderId: "sub-order-id",
        masterOrderId: "master-order-id",
        paymentReference: "reference",
        paymentGateway: "moment",
        completedAt: "2026-10-14T13:00:00.000Z",
        grossMinor: 100,
        commissionMinor: 10,
        netMinor: 90,
        currency: "NGN",
        payoutStatus: "PENDING",
        approvedAt: null,
      },
    ]);

    expect(csv).toContain('"\'=HYPERLINK(""https://example.test"")"');
  });
});
