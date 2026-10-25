import type { Attachment } from "../types/attachment";

export const splitMedia = (media: Attachment[]) => {
  const visuals: Attachment[] = [];
  const audios: Attachment[] = [];
  for (const m of media) (m.kind === "audio" ? audios : visuals).push(m);
  console.log(visuals);
  return { visuals, audios };
};
