import { describe, expect, it } from "vitest";

import { isSettlementFileForWindow } from "./moment-settlement-report.client";

describe("Moment settlement report file selection", () => {
  it("selects settlement CSVs by their period end date", () => {
    const filename =
      "20260902_Moment_RSC_Settlement_ae5811c4-0fb3-47de-8a9e-f8b298b9525b_20260901.csv";

    expect(isSettlementFileForWindow(filename, "2026-09-01", "2026-09-01")).toBe(true);
    expect(isSettlementFileForWindow(filename, "2026-09-02", "2026-09-02")).toBe(false);
  });

  it("rejects reconciliation files and non-CSV entries", () => {
    expect(
      isSettlementFileForWindow(
        "20260902_Moment_Recon_ae5811c4-0fb3-47de-8a9e-f8b298b9525b_20260901.csv",
        "2026-09-01",
        "2026-09-01",
      ),
    ).toBe(false);
    expect(
      isSettlementFileForWindow(
        "20260902_Moment_RSC_Settlement_batch_20260901.txt",
        "2026-09-01",
        "2026-09-01",
      ),
    ).toBe(false);
  });
});
