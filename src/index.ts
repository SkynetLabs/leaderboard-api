import express from 'express';
import { LEADERBOARDAPI_PORT } from './consts';
import { MongoDB } from './mongodb';
import { handler as userHandler } from './routes/user_ranking';
import { handler as userContentHandler} from './routes/user_content';
import { handler as skappsHandler } from './routes/skapp_ranking';
import { handler as contentHandler } from './routes/content_ranking';
import { IContent, IList, IUser } from './types';

async function bootAPI(port: number, db: MongoDB): Promise<void> {
  // fetch db collections
  const entriesDB = await db.getCollection<IContent>('entries');
  const usersDB = await db.getCollection<IUser>('users');
  const listsDB = await db.getCollection<IList>('lists');

  // boot the express app
  const app = express();
  app.listen(port);

  // define routes
  app.get('/skapps', (req, res) => {
    skappsHandler(req, res, entriesDB, listsDB)
  });
  app.get('/users', (req, res) => {
    userHandler(req, res, entriesDB, usersDB, listsDB)
  });
  app.get('/usercontent', (req, res) => {
    userContentHandler(req, res, entriesDB, listsDB)
  });
  app.get('/content', (req, res) => {
    contentHandler(req, res, entriesDB, listsDB)
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
