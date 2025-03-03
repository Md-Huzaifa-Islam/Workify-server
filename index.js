import "dotenv/config";
import Stripe from "stripe";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import express from "express";
import cors from "cors";
import "dotenv/config";
const app = express();
const port = process.env.PORT || 5000;
const secret = process.env.secret;
const stripe = Stripe(process.env.stripe);

// custom middleware
// for token verification
const verifyToken = (req, res, next) => {
  const token = req.cookies?.jwtToken;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: Token is missing" });
  }
  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Unauthorized: Invalid token" });
    } else {
      req.user = decoded;

      next();
    }
  });
};

// middleware
app.use(
  cors({
    origin: ["http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/", (req, res) => {
  res.send("hello to the server of Workify");
});

app.listen(port, () => {
  console.log(`the server is running in the ${port}`);
});

const uri = `mongodb+srv://${process.env.db_username}:${process.env.db_password}@cluster0.f3kdz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
//const uri = "mongodb://localhost:27017/";
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const workify = client.db("workify");
    const users = workify.collection("users");
    const tasks = workify.collection("tasks");
    const payments = workify.collection("payments");
    const reviews = workify.collection("reviews");

    // middleware needed to access db
    // verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      const email = req.user?.email;
      const filter = {
        email: email,
      };
      const result = await users.findOne(filter);
      const role = result?.role;
      if (role != "Admin") {
        return res.status(403).json({ message: "Forbidden access" });
      }
      next();
    };
    // verify HR middleware
    const verifyHR = async (req, res, next) => {
      const email = req.user?.email;
      const filter = {
        email: email,
      };
      const result = await users.findOne(filter);
      const role = result?.role;
      if (role != "HR") {
        return res.status(403).json({ message: "Forbidden access" });
      }
      next();
    };
    // verify Employee middleware
    const verifyEmployee = async (req, res, next) => {
      const email = req.user?.email;
      const filter = {
        email: email,
      };
      const result = await users.findOne(filter);
      const role = result?.role;
      if (role != "Employee") {
        return res.status(403).json({ message: "Forbidden access" });
      }
      next();
    };

    // stripe payment post method
    app.post("/stripe", verifyToken, verifyAdmin, async (req, res) => {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: "usd",
      });

      res.json({
        clientSecret: paymentIntent.client_secret,
        transactionId: paymentIntent.id,
      });
    });

    // for jwt token (completed)
    app.post("/jwt", async (req, res) => {
      const payLoad = req?.body;
      const token = jwt.sign(payLoad, secret, { expiresIn: "2h" });
      res.cookie("jwtToken", token, {
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
      });
      return res.status(200).send({ message: "Login successful" });
    });
    // for logout jwt (completed)
    app.post("/logout", (req, res) => {
      res.clearCookie("jwtToken"); // Clear the authToken cookie
      res.status(200).send({ message: "Logged out successfully" });
    });

    app.post("/addreview", verifyToken, async (req, res) => {
      const newReview = req?.body;
      const result = await reviews.insertOne(newReview);
      res.send(result);
    });

    app.get("/reviews", verifyToken, async (req, res) => {
      const result = await reviews.find().toArray();
      res.send(result);
    });

    // get role of a user (completed)
    app.get("/getrole", verifyToken, async (req, res) => {
      const user = req?.user;
      const filter = {
        email: user.email,
      };
      const result = await users.findOne(filter);
      res.send(result?.role);
    });

    // get all users for hr (completed)
    app.get("/users", verifyToken, verifyHR, async (req, res) => {
      let options = {
        sort: { created: -1 },
      };
      const filter = {
        role: "Employee",
      };
      const result = await users.find(filter, options).toArray();

      res.send(result);
    });
    // get one user data for profile (completed)
    app.get("/user", verifyToken, async (req, res) => {
      const email = req?.query?.email;
      const email2 = req?.user?.email;
      if (email != email2) {
        return res.status(403).send({ message: "Forbidden access" });
      }

      const filter = {
        email: email,
      };
      const result = await users.findOne(filter);

      res.send(result);
    });
    // get one user data for profile (for hr)
    app.get("/userhr", verifyToken, verifyHR, async (req, res) => {
      const email = req?.query?.email;

      const filter = {
        email: email,
      };
      const result = await users.findOne(filter);

      res.send(result);
    });

    // get all users for admin (completed)
    app.get("/allusers", verifyToken, verifyAdmin, async (req, res) => {
      let filter = {};
      let options = {
        sort: { created: -1 },
      };
      const result = await users.find(filter, options).toArray();

      res.send(result);
    });

    // get all payrolls for admin (completed)
    app.get("/payrolls", verifyToken, verifyAdmin, async (req, res) => {
      let filter = {};
      const options = {
        sort: {
          created: -1,
        },
      };
      const result = await payments.find(filter, options).toArray();

      res.send(result);
    });

    // add a payroll (completed)
    app.post("/payrolls", verifyToken, verifyHR, async (req, res) => {
      const newPay = req?.body;
      const result = await payments.insertOne(newPay);
      res.send(result);
    });
    // pay employee for admin (completed)
    app.patch("/payrolls/:id", verifyToken, verifyAdmin, async (req, res) => {
      const tId = req.body.tId;
      const id = req?.params.id;
      const filter = { _id: new ObjectId(id) };
      const date = new Date().getTime();
      const update = { $set: { paymentDate: date, transactionId: tId } };
      const result = await payments.updateOne(filter, update);
      res.send(result);
    });

    // change verification for employee (completed)
    app.patch(
      "/updateverified/:id",
      verifyToken,
      verifyHR,
      async (req, res) => {
        const id = req?.params.id; // Get the document ID from query parameters
        const filter = { _id: new ObjectId(id) };
        const user = await users.findOne(filter);
        const verified = user?.verified;
        const update = { $set: { verified: !verified } };
        const result = await users.updateOne(filter, update);
        res.send(result);
      }
    );

    // change role for employee (completed)
    app.patch("/updaterole/:id", verifyToken, verifyAdmin, async (req, res) => {
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

    // change fire for employee (completed)
    app.patch(
      "/updatefired/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req?.params.id;
        const filter = { _id: new ObjectId(id) };
        const user = await users.findOne(filter);
        let fire = user?.fired;
        if (fire == true) {
          fire = false;
        } else {
          fire = true;
        }
        const update = { $set: { fired: fire } };
        const result = await users.updateOne(filter, update);
        res.send(result);
      }
    );

    // post a user
    app.put("/adduser", async (req, res) => {
      const user = req?.body;
      const options = { upsert: true };
      const filter = { email: user.email };
      const foundUser = await users.findOne(filter);
      if (Boolean(foundUser)) {
        return res.send({ message: "the user already in" });
      }
      const result = await users.updateOne(filter, { $set: user }, options);
      res.send(result);
    });

    //get a task by email (completed)
    app.get("/owntask", verifyToken, verifyEmployee, async (req, res) => {
      const email = req?.query?.email;
      const email2 = req?.user?.email;
      if (email != email2) {
        return res.status(403).send({ message: "Forbidden access" });
      }

      let filter = {
        email: email,
      };
      if (!email) {
        filter = {};
      }
      const options = {
        sort: { created: -1 },
      };
      const result = await tasks.find(filter, options).toArray();
      res.send(result);
    });
    //get all task for HR (completed)
    app.get("/alltask", verifyToken, verifyHR, async (req, res) => {
      let filter = {};
      const options = {
        sort: { created: -1 },
      };
      const result = await tasks.find(filter, options).toArray();
      res.send(result);
    });

    // update a task (completed)
    app.put("/owntask/:id", verifyToken, verifyEmployee, async (req, res) => {
      const id = req?.params?.id;
      const updatedTask = req?.body;
      const email2 = req?.user?.email;
      const filter = { _id: new ObjectId(id) };
      const task = await tasks.findOne(filter);
      if (email2 != task?.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const result = await tasks.updateOne(filter, { $set: updatedTask });
      res.send(result);
    });

    //delete a task  (completed)
    app.delete("/owntask/:id", verifyToken, async (req, res) => {
      const id = req?.params?.id;
      const email2 = req?.user?.email;
      const filter = { _id: new ObjectId(id) };
      const task = await tasks.findOne(filter);
      if (email2 != task?.email) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const result = await tasks.deleteOne(filter);
      res.send(result);
    });

    //post a task (completed)
    app.post("/addtask", verifyToken, verifyEmployee, async (req, res) => {
      const email2 = req?.user?.email;
      const newTask = req?.body;
      const email = newTask?.email;
      if (email != email2) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const result = await tasks.insertOne(newTask);
      res.send(result);
    });

    //get all payment history by email  (completed)
    app.get("/ownpayment", verifyToken, verifyEmployee, async (req, res) => {
      const email2 = req?.query?.email;
      const email = req?.user?.email;
      if (email != email2) {
        return res.status(403).send({ message: "Forbidden access" });
      }
      const filter = {
        email: email2,
      };
      const options = {
        sort: { created: -1 },
      };
      const result = await payments.find(filter, options).toArray();
      res.send(result);
    });

    app.get("/details", verifyToken, verifyHR, async (req, res) => {
      const email = req?.query?.email;
      const filter = {
        email: email,
        paymentDate: { $exists: true },
      };
      const options = {
        sort: {
          payDate: 1,
        },
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
