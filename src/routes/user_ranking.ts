import { Request, Response } from 'express';
import { Collection } from 'mongodb';
import { EntryType } from './types';
import { extractQueryStringParams, isValidUserPK, printPipeline, upsertUser as discoverUser } from './util';

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
    { $match: { root: {$exists: true, $ne: ""}}},
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
    { $sort:  { [sortBy]: sortDir === 'asc' ? 1 : -1, _id: -1 }},
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
  let status = 200;
  let discovered = false
  if (userPK) {
    pipeline = [
      ...pipeline,
      { $match: { userPK: { $regex: userPK } } },
    ]

    // run user discovery, we don't await here on purpose
    //
    // TODO: we might signal to the UI here we discovered a user to show a
    // message indicating he's being indexed
    try {
      discovered = await discoverUser(usersDB, userPK)
      if (discovered) {
        status = 201; // signal UI we've discovered this user
        console.log(`User ${userPK} was added to the DB`)
      }
    } catch (error) {
      console.log(`Failure occured during user discovery ${userPK}`, error)
    }
  }

  pipeline = [
    ...pipeline,
    { $skip: skip },
    { $limit: limit },
    {$lookup: {
      from: "users",
      localField: "userPK",
      foreignField: "userPK",
      as: "userMetadata",
    }},
    {$unwind: '$userMetadata'},
    {$project: {
        "userPK" : 1,
        "newContentLast24H" : 1,
        "newContentTotal" : 1,
        "interactionsLast24H" : 1,
        "interactionsTotal" : 1,
        "rank" : 1,
        "userMetadata.mySkyProfile": 1,
        "userMetadata.skyIDProfile": 1
    }}
  ]

  printPipeline(pipeline) // will only print if flag is set

  const userCatalogCursor = entriesDB.aggregate(pipeline)
  let userCatalog = await userCatalogCursor.toArray()

  // if there are no results but it's a valid userPK, return an empty
  // result item so we don't have to show a blank page
  if (userCatalog.length === 0 && isValidUserPK(userPK)) {
    let userMetadata = {};
    try {
      const user = await usersDB.findOne({ userPK })
      userMetadata = {
        mySkyProfile: user.mySkyProfile,
        skyIDProfile: user.skyIDProfile,
      }
    } catch (error) {
      // do nothing
    }

    userCatalog = [
      {
        userPK,
        newContentLast24H: 0,
        newContentTotal: 0,
        interactionsLast24H: 0,
        interactionsTotal: 0,
        rank: await usersDB.countDocuments(),
        userMetadata,
      }
    ]
  }

  res.set("Connection", "close")
  res.status(status).json(userCatalog)
}
