import "dotenv/config";
import { MongoClient } from "mongodb";
import express from "express";
import cors from "cors";
import "dotenv/config";
const app = express();
const port = process.env.PORT;

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("hello to the server of Workify");
});

app.listen(port, () => {
  console.log(`the server is running in the ${port}`);
});

const uri = "mongodb://localhost:27017";

const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const workify = client.db("workify");
    const users = workify.collection("users");
    // get all users
    app.get("/users", async (req, res) => {
      const result = await users.find().toArray();
      res.send(result);
    });

    // post a user
    app.put("/adduser", async (req, res) => {
      const user = req.body;
      const result = await users.insertOne(user);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
