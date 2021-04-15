import {
  Collection,
  Db,
  IndexOptions,
  MongoClient,
  MongoClientOptions,
} from 'mongodb';
import { MONGO_CONNECTION_STRING, MONGO_DB_NAME } from './consts';

export class MongoDB {
  private db: Db;
  private client: MongoClient;

  public static async Connection(): Promise<MongoDB> {
    let mongo: MongoDB;
    try {
      mongo = new MongoDB(MONGO_CONNECTION_STRING, MONGO_DB_NAME)
      await mongo.connect()
    } catch (error) {
      throw new Error(`Failed to connect to mongo, err ${error.message}`);
    }
    return mongo;
  }
  
  public constructor(
    private connectionString: string,
    private databaseName: string,
    db?: Db,
    client?: MongoClient
  ) {
    this.db = db;
    this.client = client;
  }

  public async connect(): Promise<void> {
    const options: MongoClientOptions = {
      sslValidate: true,
      keepAlive: true,
      keepAliveInitialDelay: 1000,
      connectTimeoutMS: 1000,
      useNewUrlParser: true,
      useUnifiedTopology: true
    };

    this.client = await MongoClient.connect(this.connectionString, options);
    this.db = this.client.db(this.databaseName);
  }

  public async getCollection<T>(collectionName: string): Promise<Collection<T>> {
    return this.ensureCollection<T>(collectionName);
  }

  public async dropCollection(collectionName: string): Promise<void> {
    await this.db.dropCollection(collectionName);
  }

  public async ensureIndex(
    collectionName: string,
    fieldOrSpec: string | unknown,
    options?: IndexOptions
  ): Promise<string> {
    const collection = await this.ensureCollection(collectionName);
    const ensured = await collection.createIndex(fieldOrSpec, options);
    return ensured;
  }

  private async ensureCollection<T>(collectionName: string): Promise<Collection<T>> {
    const collections = await this.db
      .listCollections({ name: collectionName })
      .toArray();

    const collection = collections.length
      ? this.db.collection(collectionName)
      : await this.createCollection(collectionName);

    return collection;
  }

  private async createCollection(collectionName: string): Promise<Collection> {
    const collection = await this.db.createCollection(collectionName);
    return collection;
  }
}
