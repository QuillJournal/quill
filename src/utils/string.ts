export const pluralize = (count: number, singular: string, plural: string) => {
  return count === 1 ? singular : plural;
};

export const countWords = (str: string) => {
  return str
    .trim()
    .split(/\s+/)
    .filter((word: string) => word.length > 0).length;
};

export const stripHtml = (str: string) =>
  str
    ?.replace(/<br\s*\/?>/gi, "\n")
    ?.replace(/<\/p>|<\/div>/gi, "\n")
    ?.replace(/<[^>]+>/g, "")
    ?.replace(/\n\s*\n/g, "\n\n")
    .trim();
