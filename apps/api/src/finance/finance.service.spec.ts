import { describe, expect, it } from "vitest";

import { settlementRowsToCsv } from "./finance.service";

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
