import axios from 'axios';
import { Request, Response } from 'express';
import { Collection } from 'mongodb';
import { SCRAPERAPI_PORT, SCRAPERAPI_URL } from '../consts';
import { extractQueryStringParams, isValidUserPK, printPipeline } from './util';

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
  const {userPK, skapp, skip, limit, sortBy, sortDir} = params

  // define the aggregation pipeline
  let pipeline: object[] = [
    { $match: { skapp: {$exists: true, $ne: ""}, root: {$exists: true, $ne: ""}}},
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
    { $sort:  { [sortBy]: sortDir === 'asc' ? 1 : -1, _id: -1 }},
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
  ];

  // filter on user if necessary
  if (userPK) {
    pipeline = [
      ...pipeline,
      { $match: { userPK: { $regex: userPK } } },
    ]
  }

  // filter on skapp name if necessary
  if (skapp) {
    pipeline = [
      ...pipeline,
      { $match: { skapp: { $regex: skapp, $options: "i" } } },
    ]
  }

  pipeline = [
    ...pipeline,
    { $skip: skip },
    { $limit: limit },
  ]

  printPipeline(pipeline) // will only print if flag is set
  
  const skappsCatalogCursor = entriesDB.aggregate(pipeline)
  let skappsCatalog = await skappsCatalogCursor.toArray()
  let status = 200;

  // if there are no results but it's a valid userPK, try and discover and/or
  // scrape the user
  if (skappsCatalog.length === 0 && isValidUserPK(userPK)) {
    const endpoint = `${SCRAPERAPI_URL}:${SCRAPERAPI_PORT}/userdiscovery?userPK=${userPK}&scrape=true`

    axios
      .get(endpoint)
      .then(response => { console.log('user discovery result:', response) })
      .catch(error => { console.log('user discovery error:', error) })

    status = 201;
  }

  res.set("Connection", "close")
  res.status(status).json(skappsCatalog);
}
