import "dotenv/config";
import { MongoClient, ObjectId } from "mongodb";
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
    const tasks = workify.collection("tasks");
    const payments = workify.collection("payments");
    // get all users
    app.get("/users", async (req, res) => {
      const isAdmin = req?.query?.admin;
      let result;
      let filter = {};
      let options = {
        sort: { created: -1 },
      };
      if (Boolean(isAdmin)) {
        result = await users.find(filter, options).toArray();
      } else {
        filter = {
          role: "Employee",
        };
        result = await users.find(filter, options).toArray();
      }
      res.send(result);
    });

    // change verification for employee
    app.patch("/updateverified/:id", async (req, res) => {
      const id = req?.params.id; // Get the document ID from query parameters
      const filter = { _id: new ObjectId(id) };
      const user = await users.findOne(filter);
      const verified = user?.verified;
      const update = { $set: { verified: !verified } };
      const result = await users.updateOne(filter, update);
      res.send(result);
    });

    // change role for employee
    app.patch("/updaterole/:id", async (req, res) => {
      const id = req?.params.id;
      const filter = { _id: new ObjectId(id) };
      const user = await users.findOne(filter);
      let role = user?.role;
      if (role == "HR") {
        role = "Employee";
      } else {
        role = "HR";
      }
      const update = { $set: { role: role } };
      const result = await users.updateOne(filter, update);
      res.send(result);
    });

    // change fire for employee
    app.patch("/updatefired/:id", async (req, res) => {
      const id = req?.params.id;
      const filter = { _id: new ObjectId(id) };
      const user = await users.findOne(filter);
      let fire = user?.fired;
      if (fire == "True") {
        fire = "False";
      } else {
        fire = "True";
      }
      const update = { $set: { fired: fire } };
      const result = await users.updateOne(filter, update);
      res.send(result);
    });

    // post a user
    app.put("/adduser", async (req, res) => {
      const user = req?.body;
      const options = { upsert: true };
      const filter = { email: user.email };
      const result = await users.updateOne(filter, { $set: user }, options);
      res.send(result);
    });

    //get a task by email
    app.get("/owntask", async (req, res) => {
      const email2 = req?.query?.email;
      const filter = {
        email: email2,
      };
      const options = {
        sort: { created: -1 },
      };
      const result = await tasks.find(filter, options).toArray();
      res.send(result);
    });

    // update a task
    app.put("/owntask/:id", async (req, res) => {
      const id = req?.params?.id;
      const updatedTask = req?.body;
      const filter = { _id: new ObjectId(id) };
      const result = await tasks.updateOne(filter, { $set: updatedTask });
      res.send(result);
    });

    //delete a task
    app.delete("/owntask/:id", async (req, res) => {
      const id = req?.params?.id;
      const filter = { _id: new ObjectId(id) };
      const result = await tasks.deleteOne(filter);
      res.send(result);
    });

    //post a task
    app.post("/addtask", async (req, res) => {
      const newTask = req?.body;
      const result = await tasks.insertOne(newTask);
      res.send(result);
    });

    //get a task by email
    app.get("/ownpayment", async (req, res) => {
      const email2 = req?.query?.email;
      const filter = {
        email: email2,
      };
      const options = {
        sort: { created: -1 },
      };
      const result = await payments.find(filter, options).toArray();
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
