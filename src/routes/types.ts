export enum EntryType {
  NEWCONTENT = 'newcontent',
  INTERACTION = 'interaction',
}

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
