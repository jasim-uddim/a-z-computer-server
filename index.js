const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
var nodemailer = require("nodemailer");
var sgTransport = require("nodemailer-sendgrid-transport");
const { ObjectID } = require("bson");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
const port = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.grygc.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
}

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db("a_z_computer").collection("services");
    const orderCollection = client.db("a_z_computer").collection("order");
    const reviewCollection = client.db("a_z_computer").collection("reviews");
    const userCollection = client.db("a_z_computer").collection("users");

    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const service = await cursor.toArray();
      res.send(service);
    });

    app.get("/user", async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    });

    app.get("/admin/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === "Admin";
      res.send({ admin: isAdmin });
    });

    app.put("/user/admin/:email", async (req, res) => {
      const email = req.params.email;
      const role = req.query.role;
      // return console.log(role);
      const filter = { email: email };
      if (role === "Admin") {
        const updateDoc = {
          $set: { role: "User" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      } else {
        const updateDoc = {
          $set: { role: "Admin" },
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);
      }
    });

    // Update
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await userCollection.updateOne(filter, updateDoc, options);
      const token = jwt.sign(
        { email: email },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );
      res.send({ result, token });
    });

    app.post("/orders", async (req, res) => {
      const newOrder = req.body;
      const query = {
        name: newOrder.name,
        email: newOrder.email,
      };
      const exists = await orderCollection.findOne(query);
      if (exists) {
        return res.send({ success: false });
      } else {
        const result = await orderCollection.insertOne(newOrder);
        return res.send({ success: true });
      }
    });

    app.post("/reviews", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.get("/order", async (req, res) => {
      const email = req.query.email;
      const status = req.query.status;
      let query;
      if (status == "all") {
        query = { email };
      } else {
        query = { email, orderStatus: status };
      }
      const cursor = orderCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get("/reviews", async (req, res) => {
      const query = {};
      const cursor = reviewCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });

    app.put("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const newData = req.body;
      // return console.log(newData);
      const filter = { _id: id };
      const options = { upsert: true };
      const updateDoc = {
        $set: newData,
      };

      const result = await orderCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    app.put("/update/:id", async (req, res) => {
      const id = req.params.id;
      const updatedOrder = req.body;
      // console.log(updatedOrder);

      const filter = { _id: id };
      const options = { upsert: true };
      const updatedDoc = {
        $set: updatedOrder,
      };
      const result = await orderCollection.updateOne(
        filter,
        updatedDoc,
        options
      );
      res.send(result);
    });

    app.post("/orders", async (req, res) => {
      const newOrder = req.body;
      const query = {
        name: newOrder.name,
        email: newOrder.email,
        orderStatus: "Pandding",
      };
      const exists = await orderCollection.findOne(query);
      newOrder.orderStatus = "Pandding";
      if (exists) {
        return res.send({ success: false });
      } else {
        const result = await orderCollection.insertOne(newOrder);
        return res.send({ success: true });
      }
    });

    // Delete orders Data
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: id };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello From Doctor Uncle own portal!");
});

app.listen(port, () => {
  console.log(`A_Z_Computer App listening on port ${port}`);
});
