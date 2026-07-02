export interface ReceiptPrintInput {
  orderId: string;
  title: string;
  lines: Array<{
    label: string;
    quantity: number;
    amountMinor: number;
  }>;
  totalMinor: number;
  currency: "NGN";
}

export interface RscNativeBridge {
  printReceipt?: (input: ReceiptPrintInput) => Promise<void> | void;
}

declare global {
  interface Window {
    RSCNative?: RscNativeBridge;
  }
}

export async function printReceipt(input: ReceiptPrintInput) {
  if (!window.RSCNative?.printReceipt) {
    console.info("Receipt printing is unavailable outside the native POS shell.", input);
    return { printed: false as const };
  }

  await window.RSCNative.printReceipt(input);
  return { printed: true as const };
}
