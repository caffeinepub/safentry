interface Props {
  value: string;
  size?: number;
}

// Simple QR code placeholder using a URL-based service
export default function QRCodeDocument({ value, size = 120 }: Props) {
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
  return (
    <img
      src={qrUrl}
      alt={`QR: ${value}`}
      width={size}
      height={size}
      className="rounded border border-slate-200"
    />
  );
}
