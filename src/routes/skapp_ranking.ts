import { Request, Response } from 'express';
import { Collection } from 'mongodb';
import { extractQueryStringParams, upsertUser as discoverUser } from './util';

export async function handler(
  req: Request,
  res: Response,
  entriesDB: Collection,
  usersDB: Collection,
): Promise<void> {
  // extract and validate query string parameters
  const defaultSortColumn = 'total'
  const [params, err] = extractQueryStringParams(req, defaultSortColumn)

  // return 'Bad Request' if query string param was invalid
  if (err !== null) {
    res.status(400).json({ error: err.message })
    return;
  }

  // extract params
  const {userPK, skapp, skip, limit, sortBy, sortDir} = params

  // define the aggregation pipeline
  let pipeline: object[] = [
    {
      $addFields: {
        last24H: {
          $cond: [{ $gte: ['$createdAt', new Date(new Date().setDate(new Date().getDate() - 1))] }, true, false]
        },
      }
    },
    {
      $group: {
        _id: '$skapp',
        total: { $sum: 1 },
        last24H: { $sum: { $cond: ['$last24H', 1, 0] } }
      }
    },
    { $sort:  { [sortBy]: sortDir === 'asc' ? 1 : -1 }},
    {
      $group: {
        _id: null,
        rows: {
          $push: {
            skapp: '$_id',
            total: { $toInt: '$total' },
            last24H: { $toInt: '$last24H' },
          }
        }
      }
    },
    {
      $unwind: {
        path: "$rows",
        includeArrayIndex: "rank"
      }
    },
    {
      $replaceRoot: {
        newRoot: {
          skapp: "$rows.skapp",
          total: "$rows.total",
          last24H: "$rows.last24H",
          rank: { $toInt: { $sum: ['$rank', 1] } }
        }
      }
    },
    { $skip: skip },
    { $limit: limit },
  ];

  // filter on user if necessary
  if (userPK) {
    pipeline = [
      { $match: { userPK } },
      ...pipeline,
    ]

    // run user discovery, we don't await here on purpose
    //
    // TODO: we might signal to the UI here we discovered a user to show a
    // message indicating he's being indexed
    discoverUser(usersDB, userPK as string)
      .then(discovered => {
        if (discovered) {
          console.log(`User ${userPK} was added to the DB`)
        }
      })
      .catch(error => {
        console.log(`Failure occured during user discovery ${userPK}`, error)
      });
  }

  // filter on skapp name if necessary
  if (skapp) {
    pipeline = [
      { $match: { skapp } },
      ...pipeline,
    ]
  }

  const skappsCatalogCursor = entriesDB.aggregate(pipeline)
  const skappsCatalog = await skappsCatalogCursor.toArray()
  res.json(skappsCatalog)
  res.status(200);
}
