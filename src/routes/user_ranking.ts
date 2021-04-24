import { Request, Response } from 'express';
import { Collection } from 'mongodb';
import { EntryType } from './types';
import { extractQueryStringParams, upsertUser as discoverUser } from './util';

export async function handler(
  req: Request,
  res: Response,
  entriesDB: Collection,
  usersDB: Collection,
): Promise<void> {  
  // extract and validate query string parameters
  const defaultSortColumn = 'newContentTotal'
  const [params, err] = extractQueryStringParams(req, defaultSortColumn)

  // return 'Bad Request' if query string param was invalid
  if (err !== null) {
    res.status(400).json({ error: err.message })
    return;
  }

  // extract params
  const {userPK, skip, limit, sortBy, sortDir} = params

  // define last24H date
  const yesterday = new Date(new Date().setDate(new Date().getDate() - 1))

  // define the aggregation pipeline
  let pipeline: object[] = [
    {
      $addFields: {
        newContentLast24H: {
          $cond: [
            {
              $and: [
                { $gte: ['$createdAt', yesterday] },
                { $eq: ['$type', EntryType.NEWCONTENT]}
              ]
            },
            true,
            false
          ]
        },
        interactionLast24H: {
          $cond: [
            {
              $and: [
                { $gte: ['$createdAt', yesterday] },
                { $eq: ['$type', EntryType.INTERACTION]}
              ]
            },
            true,
            false
          ]
        },
      }
    },
    {
      $group: {
        _id: '$userPK',
        newContentLast24H: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$newContentLast24H', true] },
                  { $eq: ['$type', EntryType.NEWCONTENT]}
                ]
              },
              1,
              0
            ]
          }
        },
        newContentTotal: {
          $sum: {
            $cond: [
              { $eq: ['$type', EntryType.NEWCONTENT]},
              1,
              0
            ]
          }
        },
        interactionsLast24H: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$interactionLast24H', true] },
                  { $eq: ['$type', EntryType.INTERACTION]}
                ]
              },
              1,
              0
            ]
          }
        },
        interactionsTotal: {
          $sum: {
            $cond: [
              { $eq: ['$type', EntryType.INTERACTION]},
              1,
              0
            ]
          }
        },
      }
    },
    { $sort:  { [sortBy]: sortDir === 'asc' ? 1 : -1, _id: 1 }},
    {
      $group: {
        _id: null,
        rows: {
          $push: {
            userPK: '$_id',
            newContentLast24H: { $toInt: '$newContentLast24H' },
            newContentTotal: { $toInt: '$newContentTotal' },
            interactionsLast24H: { $toInt: '$interactionsLast24H' },
            interactionsTotal: { $toInt: '$interactionsTotal' },
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
          userPK: '$rows.userPK',
          newContentLast24H: { $toInt: '$rows.newContentLast24H' },
          newContentTotal: { $toInt: '$rows.newContentTotal' },
          interactionsLast24H: { $toInt: '$rows.interactionsLast24H' },
          interactionsTotal: { $toInt: '$rows.interactionsTotal' },
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

  pipeline = [
    ...pipeline,
    { $skip: skip },
    { $limit: limit },
  ]

  const userCatalogCursor = entriesDB.aggregate(pipeline)
  const userCatalog = await userCatalogCursor.toArray()

  res.set("Connection", "close")
  res.status(200).json(userCatalog)
}
