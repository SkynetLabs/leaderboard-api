import { Collection, Int32 as NumberInt } from "mongodb";

// discoverUser inserts an empty user object into the database. By doing so it
// will get picked up by the scraper, and its content record entries will be
// discovered on the next iterations. This function returns true if the user was
// discovered, if the user was already known it return false.
export async function discoverUser(
  userDB: Collection,
  userPK: string
): Promise<boolean> {
  const exists = await userDB.findOne({ user: userPK })
  if (exists) {
    return false;
  }

  const result = await userDB.updateOne(
    { pubkey: userPK },
    {
      $set: {
        pubkey: userPK,
        skapps: [],
        newContentCurrPage : new NumberInt(0),
        newContentCurrNumEntries : new NumberInt(0),
        contentInteractionsCurrPage : new NumberInt(0),
        contentInteractionsNumEntries : new NumberInt(0),
      }
    },
    { upsert: true }
  )
  return result.upsertedCount > 0;
}
