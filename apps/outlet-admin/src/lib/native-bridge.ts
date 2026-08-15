export type ReceiptDeliveryMode = "DELIVERY" | "TAKEOUT";

export interface ReceiptPrintInput {
  receiptId: string;
  orderId: string;
  masterOrderId?: string;
  title: string;
  outletName?: string;
  orderCode?: string | null;
  deliveryMode: ReceiptDeliveryMode;
  printedAt: string;
  currency: "NGN";
  customer?: {
    name?: string;
    phone?: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPriceMinor: number;
    modifiers?: Array<{
      name: string;
      amountMinor?: number;
    }>;
    customerNote?: string;
    lineTotalMinor: number;
  }>;
  totals: {
    subtotalMinor: number;
    modifiersMinor?: number;
    totalMinor: number;
  };
  footer?: string;
}

export interface ReceiptPrinter {
  id: string;
  name: string;
  type: "bluetooth" | "usb" | "network";
  isConnected: boolean;
  isDefault: boolean;
}

export interface ReceiptPrintResult {
  success: boolean;
  printerId?: string;
  message?: string;
}

export interface NativeBridgeCapabilities {
  printReceipt: boolean;
  previewReceipt: boolean;
  listPrinters: boolean;
  defaultPrinter: boolean;
  openCashDrawer: boolean;
}

export interface RscNativeBridge {
  printReceipt?:
    | ((input: ReceiptPrintInput) => Promise<ReceiptPrintResult | void>)
    | ((input: ReceiptPrintInput) => ReceiptPrintResult | void);
  previewReceipt?: (input: ReceiptPrintInput) => Promise<void> | void;
  listPrinters?: () => Promise<ReceiptPrinter[]> | ReceiptPrinter[];
  getDefaultPrinter?: () => Promise<ReceiptPrinter | null> | ReceiptPrinter | null;
  setDefaultPrinter?: (printerId: string) => Promise<void> | void;
  openCashDrawer?: () => Promise<void> | void;
  getCapabilities?: () =>
    | Promise<Partial<NativeBridgeCapabilities>>
    | Partial<NativeBridgeCapabilities>;
}

declare global {
  interface Window {
    RSCOutletBridge?: RscNativeBridge;
    RSCNative?: RscNativeBridge;
  }
}

const DEFAULT_CAPABILITIES: NativeBridgeCapabilities = {
  printReceipt: false,
  previewReceipt: false,
  listPrinters: false,
  defaultPrinter: false,
  openCashDrawer: false,
};

function getBridge(): RscNativeBridge | undefined {
  return window.RSCOutletBridge ?? window.RSCNative;
}

export function isRunningInStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    // iOS Safari exposes this non-standard flag.
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

export function isRunningInNativeShell() {
  return Boolean(getBridge());
}

export function getRuntimeSurface() {
  if (isRunningInNativeShell()) return "native-shell" as const;
  if (isRunningInStandaloneMode()) return "installed-pwa" as const;
  return "browser" as const;
}

export async function getNativeBridgeCapabilities(): Promise<NativeBridgeCapabilities> {
  const bridge = getBridge();

  if (!bridge) return DEFAULT_CAPABILITIES;

  const reportedCapabilities = await bridge.getCapabilities?.();

  return {
    printReceipt: Boolean(reportedCapabilities?.printReceipt ?? bridge.printReceipt),
    previewReceipt: Boolean(reportedCapabilities?.previewReceipt ?? bridge.previewReceipt),
    listPrinters: Boolean(reportedCapabilities?.listPrinters ?? bridge.listPrinters),
    defaultPrinter: Boolean(
      reportedCapabilities?.defaultPrinter ?? bridge.getDefaultPrinter ?? bridge.setDefaultPrinter,
    ),
    openCashDrawer: Boolean(reportedCapabilities?.openCashDrawer ?? bridge.openCashDrawer),
  };
}

export async function listPrinters(): Promise<ReceiptPrinter[]> {
  const bridge = getBridge();

  if (!bridge?.listPrinters) return [];

  return bridge.listPrinters();
}

export async function printReceipt(input: ReceiptPrintInput) {
  const bridge = getBridge();

  if (!bridge?.printReceipt) {
    console.info("Receipt printing is unavailable outside the native POS shell.", input);
    return { printed: false as const };
  }

  const result = await bridge.printReceipt(input);

  return {
    printed: true as const,
    success: result?.success ?? true,
    printerId: result?.printerId,
    message: result?.message,
  };
}

export async function previewReceipt(input: ReceiptPrintInput) {
  const bridge = getBridge();

  if (!bridge?.previewReceipt) return { previewed: false as const };

  await bridge.previewReceipt(input);
  return { previewed: true as const };
}
