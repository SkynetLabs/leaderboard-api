import { Collection, Int32 as NumberInt } from "mongodb";

export async function upsertUser(userDB: Collection, userPK: string): Promise<boolean> {
  const { upsertedCount } = await userDB.updateOne(
    { userPK },
    {
      $setOnInsert: {
        userPK,
        skapps: [] as string[],
        newContentCurrPage : new NumberInt(0),
        newContentCurrNumEntries: new NumberInt(0),
        newContentConsecNoneFound: new NumberInt(0),

        contentInteractionsCurrPage : new NumberInt(0),
        contentInteractionsNumEntries: new NumberInt(0),
        contentInteractionsNoneFound: new NumberInt(0),
        createdAt: new Date(),
      }
    },
    { upsert: true }
  )
  return upsertedCount === 1
}