import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";

const MAGIC = new Uint8Array([0x51, 0x41, 0x54, 0x31]);
const CHUNK = 1024 * 1024;
const NONCE = 24;
const TAG = 16;
const ENC_CHUNK = NONCE + CHUNK + TAG;

export interface AttachmentAad {
  diaryId: string;
  entryId: string;
  attachmentId: string;
  keyEpoch: number;
}

const aad = (a: AttachmentAad, index: number, last: boolean) =>
  new TextEncoder().encode(
    `quill-att:${a.diaryId}:${a.entryId}:${a.attachmentId}:${a.keyEpoch}:${index}:${last ? 1 : 0}`,
  );

const yieldToUi = () => new Promise<void>((r) => setTimeout(r, 0));

export async function encryptFileToFile(
  srcUri: string,
  destUri: string,
  key: Uint8Array,
  ctx: AttachmentAad,
): Promise<void> {
  const src = new File(srcUri);
  const dest = new File(destUri);
  if (dest.exists) dest.delete();
  dest.create();
  const inH = src.open();
  const outH = dest.open();
  let ok = false;
  try {
    outH.writeBytes(MAGIC);
    let remaining = src.size;
    let index = 0;
    do {
      const n = Math.min(CHUNK, remaining);
      const plain = n > 0 ? inH.readBytes(n) : new Uint8Array(0);
      remaining -= n;
      const nonce = Crypto.getRandomValues(new Uint8Array(NONCE));
      const ct = xchacha20poly1305(
        key,
        nonce,
        aad(ctx, index, remaining === 0),
      ).encrypt(plain);
      outH.writeBytes(nonce);
      outH.writeBytes(ct);
      index++;
      await yieldToUi();
    } while (remaining > 0);
    ok = true;
  } finally {
    inH.close();
    outH.close();
    if (!ok && dest.exists) dest.delete();
  }
}

export async function decryptFileToFile(
  srcUri: string,
  destUri: string,
  key: Uint8Array,
  ctx: AttachmentAad,
): Promise<void> {
  const src = new File(srcUri);
  const dest = new File(destUri);
  const total = src.size;
  if (total < MAGIC.length + NONCE + TAG)
    throw new Error("Attachment is truncated.");
  if (dest.exists) dest.delete();
  dest.create();
  const inH = src.open();
  const outH = dest.open();
  let ok = false;
  try {
    const magic = inH.readBytes(MAGIC.length);
    if (!MAGIC.every((b, i) => magic[i] === b))
      throw new Error("Unrecognized attachment format.");
    let pos = MAGIC.length;
    let index = 0;
    while (pos < total) {
      const len = Math.min(ENC_CHUNK, total - pos);
      if (len < NONCE + TAG) throw new Error("Attachment is truncated.");
      const last = pos + len >= total;
      const buf = inH.readBytes(len);
      pos += len;
      const plain = xchacha20poly1305(
        key,
        buf.subarray(0, NONCE),
        aad(ctx, index, last),
      ).decrypt(buf.subarray(NONCE));
      outH.writeBytes(plain);
      index++;
      await yieldToUi();
    }
    ok = true;
  } finally {
    inH.close();
    outH.close();
    if (!ok && dest.exists) dest.delete();
  }
}
