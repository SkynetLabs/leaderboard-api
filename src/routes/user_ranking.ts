import axios from 'axios';
import { Request, Response } from 'express';
import { Collection } from 'mongodb';
import { SCRAPERAPI_PORT, SCRAPERAPI_URL } from '../consts';
import { EntryType } from './types';
import { extractQueryStringParams, isValidUserPK, printPipeline } from './util';

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
  if (userPK) {
    pipeline = [
      ...pipeline,
      { $match: { userPK: { $regex: userPK } } },
    ]

    // if the userPK is a valid on, send it to user discovery
    if (isValidUserPK(userPK)) {
      const endpoint = `${SCRAPERAPI_URL}:${SCRAPERAPI_PORT}/userdiscovery?userPK=${userPK}&scrape=true`
      axios
        .get(endpoint)
        .catch(error => {
          if (error.response && error.response.status === 429) {
            console.log('scrape did not execute, too many requests')
            return;
          }
          console.log('user discovery error:', error)
        })
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

  // if there are no results but it's a valid userPK, return an empty result for
  // the time being
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
  res.status(200).json(userCatalog)
}
