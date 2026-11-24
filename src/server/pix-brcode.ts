import QRCode from "qrcode";

const tlv = (id: string, value: string) => id + String(value.length).padStart(2, "0") + value;

export function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) {
      crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function payloadPix(chave: string, valor: string, pedido: string) {
  const key = chave.trim().toLowerCase().replace(/^["']|["']$/g, "");
  const ref = (pedido.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "MOSHR");
  const conta = tlv("00", "br.gov.bcb.pix") + tlv("01", key) + tlv("02", ref);
  const semCrc = [
    tlv("00", "01"),
    tlv("01", "11"),
    tlv("26", conta),
    tlv("52", "0000"),
    tlv("53", "986"),
    tlv("54", Number(valor).toFixed(2)),
    tlv("58", "BR"),
    tlv("59", "MOSHR"),
    tlv("60", "SAOPAULO"),
    tlv("62", tlv("05", "***")),
    "6304",
  ].join("");
  return semCrc + crc16(semCrc);
}

export async function qrPix(payload: string) {
  const url = await QRCode.toDataURL(payload, { margin: 1, width: 320, errorCorrectionLevel: "M" });
  return url.replace(/^data:image\/png;base64,/, "");
}
