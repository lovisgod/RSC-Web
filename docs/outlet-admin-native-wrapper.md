# Outlet Admin native wrapper contract

`apps/outlet-admin` is designed to run in three surfaces:

1. normal browser,
2. installed PWA,
3. Flutter/native WebView shell.

The PWA path gives staff an installable app-like experience. The Flutter shell owns POS hardware
access such as thermal printers and cash drawers.

## Runtime bridge

The web app looks for this object on `window`:

```ts
window.RSCOutletBridge;
```

`window.RSCNative` is still supported as a legacy alias, but new wrappers should use
`RSCOutletBridge`.

## Methods

```ts
interface RSCOutletBridge {
  printReceipt?: (input: ReceiptPrintInput) => Promise<void> | void;
  openCashDrawer?: () => Promise<void> | void;
  getCapabilities?: () =>
    | Promise<Partial<NativeBridgeCapabilities>>
    | Partial<NativeBridgeCapabilities>;
}

interface NativeBridgeCapabilities {
  printReceipt: boolean;
  openCashDrawer: boolean;
}

interface ReceiptPrintInput {
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
```

## Web app behavior

- If `RSCOutletBridge.printReceipt` exists, receipt printing is delegated to Flutter/native.
- If the bridge is absent, the web app does not fail. It shows a safe “printing unavailable”
  message.
- API calls and sockets remain browser/web responsibilities and must keep using HttpOnly cookies.
- The service worker must not cache `/api` or `/socket.io` responses.

## Flutter wrapper responsibility

The Flutter shell should inject the bridge before outlet-admin needs to print:

```js
window.RSCOutletBridge = {
  getCapabilities: () => ({ printReceipt: true, openCashDrawer: false }),
  printReceipt: async (payload) => {
    // Forward payload to Flutter through the WebView JavaScript channel.
  },
};
```

The native side should validate the payload shape before sending it to printer SDKs.

## PWA responsibility

The web app ships:

- `manifest.webmanifest`
- install metadata/icons
- a conservative service worker for app shell/static assets only

This makes outlet-admin installable where the POS/browser supports PWA installation, while still
leaving real POS hardware access to the native wrapper.
