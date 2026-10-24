import { resolveAttachmentUri } from "@/src/services/attachments";
import { Image } from "expo-image";

const blurhash = "L6PZfSi_00os00j[fQfQ00fQfQfQ";
type FeedMediaProps = { relPath: string };
export default function FeedMedia({ relPath }: FeedMediaProps) {
  const imageSource = resolveAttachmentUri(relPath);
  return (
    <Image
      source={imageSource}
      placeholder={{ blurhash }}
      contentFit="cover"
      transition={1000}
      style={{ width: "100%", aspectRatio: 16 / 9 }}
    />
  );
}
