import { Request } from 'express';
import { DEBUG_PIPELINE } from "../consts";
import { QueryStringParams } from '../types';

export function extractQueryStringParams(
  req: Request,
  defaultSortBy: string = ""
): [QueryStringParams | null, Error | null] {
    // filters
    const skapp = req.query.skapp || "";  
    const identifier = req.query.identifier || "";
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
    if (typeof identifier !== 'string') {
      return [null, new Error("Parameter 'identifier' should be a string")]
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
      identifier,
      userPK,
      
      // pagination
      skip,
      limit,

      // sorting
      sortBy,
      sortDir,
    }, null]
}

export function isValidUserPK(userPK: string): boolean {
  if (!userPK || typeof userPK !== "string") {
    return false;
  }

  const regexp = /^(?<userPK>[a-z0-9]{64})$/;
  const matchResult = userPK.match(regexp)
  if (!matchResult || !matchResult.groups.userPK) {
    return false;
  }
  return true;
}

export function printPipeline(pipeline: object[]): void {
  if (DEBUG_PIPELINE) {
    console.log(JSON.stringify(pipeline))
  }
}
