import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const client = new MongoClient(uri);

let db;

export async function connectDb() {
  if (db) return db;
  await client.connect();
  db = client.db("lyrictype"); // We'll name our database 'lyrictype'
  console.log("Connected to MongoDB.");
  return db;
}

export const usersCollection = () => db.collection("users");
export const scoresCollection = () => db.collection("scores");
