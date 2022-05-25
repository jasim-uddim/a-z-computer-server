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

async function run() {
  try {
    await client.connect();
    const serviceCollection = client.db("a_z_computer").collection("services");
    const orderCollection = client.db("a_z_computer").collection("order");
    const reviewCollection = client.db("a_z_computer").collection("reviews");

    app.get("/service", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const service = await cursor.toArray();
      res.send(service);
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

    app.get("/orders", async (req, res) => {
      const email = req.query.email;
      const query = { email };
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
      const filter = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          quantity: newData.quantity,
        },
      };

      const result = await orderCollection.updateOne(
        filter,
        updateDoc,
        options
      );
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
