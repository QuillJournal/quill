import {eq} from "drizzle-orm"
import {db} from "."
import {stickersTable} from "./schema"
type stickertype = {
    id: number,
    x: number, 
    y: number, 
    dialtion: number, 
    rotation: number, 
    index: number, 
}
export const SaveStickers = async (stickery: stickertype[], entryId: number): Promise<void> => {
    await updateStickersByEntryId(entryId,stickery)
}
export const getStickersByEntryId = async (entryId: number): Promise<stickertype[]> => {
  const allRows = await db.select().from(stickersTable).where(eq(stickersTable.entryId, entryId));
  return allRows.map((row) => ({
    id: row.id,
    x: row.x, 
    y: row.y, 
    dialtion: row.dialtion,
    rotation: row.rotation, 
    index: row.index,
  }));
};
export const updateStickersByEntryId = async (entryId: number, stickers: stickertype[]): Promise<void> => {
  return await db.transaction(async (transaction) => {
    await transaction.delete(stickersTable).where(eq(stickersTable.entryId, entryId));
    if(stickers.length > 0){
        await transaction.insert(stickersTable).values(
            stickers.map((sticker) => ({
                entryId,
                x: sticker.x,
                y: sticker.y, 
                dialtion: sticker.dialtion,
                rotation: sticker.rotation,
                index: sticker.index,
            })
        ))   
    }
    
  })
};
