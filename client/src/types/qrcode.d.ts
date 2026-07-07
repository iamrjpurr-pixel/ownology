// Ambient type shim for the `qrcode` npm module (used by JoinQr.tsx and
// TankQr.tsx). We only exercise a tiny subset of the API — toDataURL —
// so a full @types/qrcode install is overkill. If we start using more of
// the module (e.g. toCanvas, toString), extend this file rather than
// upgrading to @types/qrcode.
declare module "qrcode" {
  export type ErrorCorrectionLevel = "L" | "M" | "Q" | "H";
  export interface QRCodeToDataURLOptions {
    errorCorrectionLevel?: ErrorCorrectionLevel;
    margin?: number;
    width?: number;
    scale?: number;
    color?: { dark?: string; light?: string };
    type?: "image/png" | "image/jpeg" | "image/webp";
  }
  export function toDataURL(
    text: string,
    options?: QRCodeToDataURLOptions
  ): Promise<string>;
  const _default: { toDataURL: typeof toDataURL };
  export default _default;
}
