import { Request, Response } from 'express';
import { Collection } from 'mongodb';
import { EntryType } from './types';
import { discoverUser } from './util';

export async function handler(
  req: Request,
  res: Response,
  entriesDB: Collection,
  usersDB: Collection,
): Promise<void> {  
  // grab query string parameters
  const userPK = req.query.userPK || "";

  const skip = req.query.skip || 0;
  const limit = req.query.limit || 20;

  // defaults to 'newContentTotal' 'desc'
  const sortBy = (req.query.sortBy || "newContentTotal") as string;
  const sortDir = req.query.sortDir === 'asc' ? 1 : -1

  // validate query string parameters
  // TODO

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
    { $sort:  { [sortBy]: sortDir }},
    {
      $group: {
        _id: null,
        rows: {
          $push: {
            user: '$userPK',
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
          user: '$rows.userPK',
          newContentLast24H: { $toInt: '$rows.newContentLast24H' },
          newContentTotal: { $toInt: '$rows.newContentTotal' },
          interactionsLast24H: { $toInt: '$rows.interactionsLast24H' },
          interactionsTotal: { $toInt: '$rows.interactionsTotal' },
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
      { $match: { user: userPK } },
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

  const skappsCatalogCursor = entriesDB.aggregate(pipeline)
  res.json(await skappsCatalogCursor.toArray())
}
