/** Width and height from a PNG IHDR chunk or a JPEG start-of-frame marker. */
export function imageSize(
  bytes: Uint8Array,
  extension: 'png' | 'jpg',
): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (extension === 'png') {
    if (bytes.length < 24 || view.getUint32(12) !== 0x49484452)
      throw new Error('PNG image has no IHDR chunk');
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) throw new Error('Malformed JPEG marker');
    const marker = bytes[offset + 1];
    // Start-of-frame markers, excluding DHT (C4), JPG (C8) and DAC (CC).
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marker)
    )
      return {
        height: view.getUint16(offset + 5),
        width: view.getUint16(offset + 7),
      };
    offset += 2 + view.getUint16(offset + 2);
  }
  throw new Error('JPEG image has no start-of-frame marker');
}
