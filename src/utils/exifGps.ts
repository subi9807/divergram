function readAscii(view: DataView, start: number, len: number) {
  let out = '';
  for (let i = 0; i < len; i++) out += String.fromCharCode(view.getUint8(start + i));
  return out;
}

function rational(view: DataView, offset: number, little: boolean) {
  const num = view.getUint32(offset, little);
  const den = view.getUint32(offset + 4, little);
  return den === 0 ? 0 : num / den;
}

function dmsToDecimal(d: number, m: number, s: number, ref: string) {
  const sign = ref === 'S' || ref === 'W' ? -1 : 1;
  return sign * (d + m / 60 + s / 3600);
}

export async function extractGpsFromImage(file: File): Promise<{ lat: number; lng: number } | null> {
  if (!file.type.includes('jpeg') && !file.type.includes('jpg')) return null;

  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  if (view.getUint16(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset < view.byteLength) {
    const marker = view.getUint16(offset);
    offset += 2;

    if ((marker & 0xff00) !== 0xff00) break;
    if (marker === 0xffda || marker === 0xffd9) break;

    const size = view.getUint16(offset);
    const segmentStart = offset + 2;

    if (marker === 0xffe1 && readAscii(view, segmentStart, 6) === 'Exif\u0000\u0000') {
      const tiff = segmentStart + 6;
      const little = readAscii(view, tiff, 2) === 'II';
      const ifd0Offset = view.getUint32(tiff + 4, little);
      const ifd0 = tiff + ifd0Offset;
      const entries = view.getUint16(ifd0, little);

      let gpsIfdRel = 0;
      for (let i = 0; i < entries; i++) {
        const e = ifd0 + 2 + i * 12;
        const tag = view.getUint16(e, little);
        if (tag === 0x8825) {
          gpsIfdRel = view.getUint32(e + 8, little);
          break;
        }
      }
      if (!gpsIfdRel) return null;

      const gpsIfd = tiff + gpsIfdRel;
      const gpsEntries = view.getUint16(gpsIfd, little);

      let latRef = '';
      let lngRef = '';
      let latVals: number[] | null = null;
      let lngVals: number[] | null = null;

      for (let i = 0; i < gpsEntries; i++) {
        const e = gpsIfd + 2 + i * 12;
        const tag = view.getUint16(e, little);
        const type = view.getUint16(e + 2, little);
        const count = view.getUint32(e + 4, little);
        const valueOffset = view.getUint32(e + 8, little);

        if (tag === 0x0001 && type === 2) {
          latRef = readAscii(view, count <= 4 ? e + 8 : tiff + valueOffset, 1);
        }
        if (tag === 0x0003 && type === 2) {
          lngRef = readAscii(view, count <= 4 ? e + 8 : tiff + valueOffset, 1);
        }
        if (tag === 0x0002 && type === 5 && count === 3) {
          const base = tiff + valueOffset;
          latVals = [rational(view, base, little), rational(view, base + 8, little), rational(view, base + 16, little)];
        }
        if (tag === 0x0004 && type === 5 && count === 3) {
          const base = tiff + valueOffset;
          lngVals = [rational(view, base, little), rational(view, base + 8, little), rational(view, base + 16, little)];
        }
      }

      if (latVals && lngVals && latRef && lngRef) {
        return {
          lat: dmsToDecimal(latVals[0], latVals[1], latVals[2], latRef),
          lng: dmsToDecimal(lngVals[0], lngVals[1], lngVals[2], lngRef),
        };
      }

      return null;
    }

    offset = segmentStart + size - 2;
  }

  return null;
}
