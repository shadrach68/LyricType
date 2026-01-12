import { MongoClient } from "mongodb";
import "dotenv/config";

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
if (!uri){
  throw new Error("please provide a MongoDB URI");
}
const client = new MongoClient(uri);

let db;

export async function connectDb() {
  if (db) return db;
  await client.connect();
  db = client.db("lyrictype"); 
  console.log("Connected to MongoDB.");
  return db;
}

export const usersCollection = () => db.collection("users");
export const scoresCollection = () => db.collection("scores");
export const trainingScoresCollection = () => db.collection("trainingScores");
export const feedbackCollection = () => db.collection("feedback");
