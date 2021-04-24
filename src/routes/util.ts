import { Collection, Int32 as NumberInt } from "mongodb";
import { QueryStringParams } from "./types";
import { Request } from 'express';

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

export function extractQueryStringParams(
  req: Request,
  defaultSortBy: string = ""
): [QueryStringParams | null, Error | null] {
    // filters
    const skapp = req.query.skapp || "";  
    const skylink = req.query.skylink || "";
    const userPK = req.query.userPK || "";

    // pagination
    const skip = parseInt(req.query.skip as string || '0', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
  
    // sorting
    const sortBy = (req.query.sortBy || defaultSortBy) as string;
    const sortDir = (req.query.sortDir || 'desc') as string;
  
    // validate the params
    if (typeof skapp !== 'string') {
      return [null, new Error("Parameter 'skapp' should be a string")]
    }
    if (typeof skylink !== 'string') {
      return [null, new Error("Parameter 'skylink' should be a string")]
    }
    if (typeof userPK !== 'string') {
      return [null, new Error("Parameter 'userPK' should be a string")]
    }
    if (sortDir !== 'asc' && sortDir !== 'desc') {
      return [null, new Error("Parameter 'sortDir' should be 'asc' or 'desc'")]
    }

    if (skip < 0) {
      return [null, new Error("Parameter 'skip' should be positive")]
    }
    if (limit <= 0) {
      return [null, new Error("Parameter 'limit' should be positive and non zero")]
    }

    // TODO: should we enable skylink validation?
    //
    // if (skylink) {
    //   const regexp = /^(?<skylink>[a-zA-Z0-9-_]{46})$/;
    //   const matchResult = skylink.match(regexp)
    //   if (!matchResult || !matchResult.groups.skylink) {
    //     return [null, new Error("Parameter 'skylink' should be a valid, 46-character skylink")]
    //   }
    // }
  
    // TODO user PK validation
  
    return [{
      // filters
      skapp,
      skylink,
      userPK,
      
      // pagination
      skip,
      limit,

      // sorting
      sortBy,
      sortDir,
    }, null]
}
