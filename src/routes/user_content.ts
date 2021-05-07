import { Request, Response } from 'express';
import { Collection } from 'mongodb';
import { EListType, IList } from '../types';
import { extractQueryStringParams, isValidUserPK, printPipeline } from './util';

export async function handler(
  req: Request,
  res: Response,
  entriesDB: Collection,
  listsDB: Collection<IList>,
): Promise<void> {  
  // extract and validate query string parameters
  const defaultSortColumn = 'createdAt'
  const [params, err] = extractQueryStringParams(req, defaultSortColumn)

  // return 'Bad Request' if query string param was invalid
  if (err !== null) {
    res.status(400).json({ error: err.message })
    return;
  }

  // extract params
  const { userPK, skip, limit, sortBy, sortDir } = params
  
  // check whether we have a valid userPK
  if (!userPK) {
    res.status(400).json({ error: "param 'userPK' is required" })
    return;
  }
  if (!isValidUserPK(userPK)) {
    res.status(400).json({ error: `value '${userPK}' for param 'userPK' is considered invalid` })
    return;
  }

  // fetch user blocklist
  const blocklist = await listsDB.findOne({ type: EListType.USER_BLOCKLIST })
  const blockListItems = blocklist ? blocklist.items : [];
  if (blockListItems.includes(userPK)) {
    res.status(400).json({ error: `'${userPK}' is blocked`})
    return; 
  }

  // define the aggregation pipeline
  let pipeline: object[] = [
    {
      $match: {
        root: { $exists: true, $ne: "" },
        userPK
      },
    },
    {$project: {
      _id: 0,
      entryType: 1,
      userPK: 1,
      skapp: 1,
      identifier: 1,
      metadata: 1,
      createdAt: 1,
    }},
    { $sort:  { [sortBy]: sortDir === 'asc' ? 1 : -1, _id: -1 }},
    { $skip: skip },
    { $limit: limit },
  ]

  printPipeline(pipeline) // will only print if flag is set

  const userContentCursor = entriesDB.aggregate(pipeline)
  const contentCatalog = await userContentCursor.toArray()

  res.set("Connection", "close")
  res.status(200).json(contentCatalog)
}
