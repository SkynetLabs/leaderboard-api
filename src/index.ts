import express from 'express';
import { LEADERBOARDAPI_PORT } from './consts';
import { MongoDB } from './mongodb';
import { handler as userHandler } from './routes/user_ranking';
import { handler as skappsHandler } from './routes/skapp_ranking';
import { handler as contentHandler} from './routes/content_ranking';

async function bootAPI(port: number, db: MongoDB): Promise<void> {
  // fetch db collections
  const entriesDB = await db.getCollection('entries');
  const usersDB = await db.getCollection('users');

  // boot the express app
  const app = express();
  app.listen(port);

  // define routes
  app.get('/skapps', (req, res) => {
    skappsHandler(req, res, entriesDB, usersDB)
  });
  app.get('/users', (req, res) => {
    userHandler(req, res, entriesDB, usersDB)
  });
  app.get('/content', (req, res) => {
    contentHandler(req, res, entriesDB, usersDB)
  });
}

(async () => {
  // connect to database
  let mongoDB: MongoDB;
  try {
    mongoDB = await MongoDB.Connection();
  } catch (error) {
    console.error('Failed to connect to database', error);
    process.exit(1);
  }
  console.log('MongoDB connected.')

  // boot the API
  try {
    await bootAPI(LEADERBOARDAPI_PORT, mongoDB);
  } catch (error) {
    console.error('Failed to boot API', error);
    process.exit(1);
  }

  console.log('Leaderboard API is running at port', LEADERBOARDAPI_PORT)
})()
