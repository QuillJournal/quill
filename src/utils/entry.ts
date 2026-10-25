export const isMine = (authorId: string, userId: string | undefined) => {
  if (!userId) return false;
  return authorId === userId;
};
