import { Request, Response } from 'express';
import { Collection } from 'mongodb';

export async function handler(
  req: Request,
  res: Response,
  entriesDB: Collection,
  usersDB: Collection,
): Promise<void> {
  // grab query string parameters
  const skylink = req.query.skylink || "";
  
  const skip = parseInt(req.query.skip as string || '0', 10);
  const limit = parseInt(req.query.limit as string || '20', 10);

  // defaults to 'total' 'desc'
  const sortBy = (req.query.sortBy || "total") as string;
  const sortDir = req.query.sortDir === 'asc' ? 1 : -1

  // validate query string parameters
  // TODO

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
        _id: '$skylink',
        total: { $sum: 1 },
        last24H: { $sum: { $cond: ['$last24H', 1, 0] } }
      }
    },
    { $sort:  { [sortBy]: sortDir }},
    {
      $group: {
        _id: null,
        rows: {
          $push: {
            skylink: '$_id',
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
          skylink: "$rows.skylink",
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
  if (skylink) {
    pipeline = [
      { $match: { skylink } },
      ...pipeline,
    ]
  }

  const contentCatalogCursor = entriesDB.aggregate(pipeline)
  const contentCatalog = await contentCatalogCursor.toArray()
  res.json(contentCatalog)
  res.status(200);
}
