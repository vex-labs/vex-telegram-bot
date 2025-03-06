import { MongoClient } from 'mongodb';
import * as dotenv from 'dotenv';
import { config } from './config';

dotenv.config();

const uri = process.env.MONGODB_URI;
const { dbName, collections } = config;

if (!uri) {
  throw new Error("MONGODB_URI environment variable is not set");
}

type UserData = {
  account_id: string;
  mpc_key: string;
  telegram_username: string;
};

export async function findUserByTelegramUsername(username: string): Promise<UserData | null> {
  const client = new MongoClient(uri!);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection(collections.users);
    
    const user = await collection.findOne({ 
      telegram_username: username 
    });
    return user as UserData | null;
  } catch (error) {
    console.error('Error finding user:', error);
    return null;
  } finally {
    await client.close();
  }
} 