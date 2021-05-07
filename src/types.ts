import { ObjectId } from "mongodb";

export interface QueryStringParams {
  // filters
  skapp?: string;
  identifier?: string;
  userPK?: string;
  
  // pagination
  skip: number;
  limit: number;

  // sorting
  sortBy?: string; // database column
  sortDir?: 'asc' | 'desc';
}

export enum EntryType {
  NEWCONTENT = 'newcontent',
  INTERACTION = 'interaction',
}

export interface IContent {
  _id: ObjectId;

  // root identifies to what entry this entry refers to, this way we can
  // aggregate interactions with parent entries. We call this root and not
  // parent because an entry without parent refers to itself and not null.
  root: string;

  // identifier will uniquely identify this entry, Feed DAC does not use
  // skylinks, therefor we need a new identifier property, for the Content
  // Record DAC the identifier will be equal to the skyink, for the Feed DAC
  // this will be different
  identifier: string;

  // type will squash all entry types on `newcontent` or `interactions`, this
  // way the leaderboard can render its UI and new entry types can be introduced
  type: string;

  dacDataDomain: string;
  entryType: EntryType;
  
  userPK: string;
  skapp: string;
  skylink: string;
  skylinkUnsanitized: string;
  metadata: object;
  createdAt: Date;
  scrapedAt: Date;
}

export interface IInteraction extends IContent { }

export interface IUser {
  _id?: ObjectId;
  
  userPK: string;
  skapps: string[];

  newContentCurrPage: IDictionary<number>;
  newContentCurrNumEntries: IDictionary<number>;

  contentInteractionsCurrPage: IDictionary<number>;
  contentInteractionsNumEntries: IDictionary<number>;

  postsCurrPage: IDictionary<number>;
  postsCurrNumEntries: IDictionary<number>;

  commentsCurrPage: IDictionary<number>;
  commentsCurrNumEntries: IDictionary<number>;

  cachedDataLinks: IDictionary<DataLink>;

  mySkyProfile?: IProfileIndex;
  skyIDProfile?: IUserProfile;

  createdAt: Date;
  discoveredAt?: Date; // will only be set by leaderboard API (insta scrape)
}

export enum EListType {
  SKAPP_ALLOWLIST = 'SKAPP_ALLOWLIST',
  SKAPP_BLOCKLIST = 'SKAPP_BLOCKLIST',
  USER_BLOCKLIST = 'USER_BLOCKLIST',
}

export interface IList {
  type: EListType;
  items: string[];
}

export interface IProfileIndex {
  version: number;
  profile: IMySkyUserProfile;
  lastUpdatedBy: string;
  historyLog: IHistoryLog[];
}

export interface IMySkyUserProfile {
  version: number;
  username: string;
  firstName?: string;
  lastName?: string;
  emailID?: string;
  contact?: string;
  aboutMe?: string;
  location?: string;
  topics?: string[];
  avatar?: IAvatar[];
  connections?: unknown[];
}

export interface IAvatar {
  ext: string,
  w: number,
  h: number,
  url: string
}

export interface IHistoryLog {
  updatedBy: string,
  timestamp: Date
}

export interface IProfileIndex {
  version: number;
  profile: IMySkyUserProfile;
  lastUpdatedBy: string;
  historyLog: IHistoryLog[];
}

export interface IDictionary<T> {
  [key: string]: T
}

export interface IUserProfile {
  username: string;
  aboutMe: string;
  location: string;
  avatar: string;
  dapps: IDictionary<IDapp>;
}

export interface IUserProfile {
  username: string;
  aboutMe: string;
  location: string;
  avatar: string;
  dapps: IDictionary<IDapp>;
}

export interface IDapp {
  url: string;
  publicKey: string;
  img: string;
}

export type DataLink = string;
