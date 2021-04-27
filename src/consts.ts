
// tslint:disable: no-var-requires
// tslint:disable: no-require-imports
require('dotenv').config()

export const MONGO_CONNECTION_STRING =
  process.env.MONGO_CONNECTION_STRING || 'mongodb://localhost:27017'

export const MONGO_DB_NAME =
  process.env.MONGO_DB_NAME || 'content-record'

export const LEADERBOARDAPI_PORT =
  parseInt(process.env.PORT || '3000', 10)

export const DEBUG_PIPELINE =
  process.env.DEBUG_PIPELINE === 'true' || false
