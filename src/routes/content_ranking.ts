import { Request, Response } from 'express';
import { Collection } from 'mongodb';
import { extractQueryStringParams } from './util';

export async function handler(
  req: Request,
  res: Response,
  entriesDB: Collection,
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
  const {skylink, skip, limit, sortBy, sortDir} = params

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
    { $sort:  { [sortBy]: sortDir === 'asc' ? 1 : -1 }},
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
  res.status(200).json(contentCatalog);
}
