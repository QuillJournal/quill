import { eq } from "drizzle-orm";
import { db } from ".";
import {
  diariesTable as diaries,
  diaryMembersTable as members,
} from "./schema";

export const getDiaryMembers = async (diaryId: number) => {
  try {
    const rows = await db
      .select({
        userId: members.userId,
        name: members.name,
        username: members.username,
      })
      .from(members)
      .innerJoin(diaries, eq(diaries.remoteId, members.diaryRemoteId))
      .where(eq(diaries.id, diaryId));

    const byId = new Map<string, string>();
    for (const r of rows) {
      byId.set(r.userId, r.name || `@${r.username}`);
    }
    return byId;
  } catch (error) {
    console.error("Database query failed:", error);
    throw error;
  }
};
