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

export interface NativeBridgeCapabilities {
  printReceipt: boolean;
  openCashDrawer: boolean;
}

export interface RscNativeBridge {
  printReceipt?: (input: ReceiptPrintInput) => Promise<void> | void;
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
    openCashDrawer: Boolean(reportedCapabilities?.openCashDrawer ?? bridge.openCashDrawer),
  };
}

export async function printReceipt(input: ReceiptPrintInput) {
  const bridge = getBridge();

  if (!bridge?.printReceipt) {
    console.info("Receipt printing is unavailable outside the native POS shell.", input);
    return { printed: false as const };
  }

  await bridge.printReceipt(input);
  return { printed: true as const };
}
