const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express()
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.mznotex.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const usersCollection = client.db("reelifyDB").collection("users");
    const classesCollection = client.db("reelifyDB").collection("classes");
    const enrollsCollection = client.db("reelifyDB").collection("enrolls");

    // users apis
    // save user email and role (other details if needed)
    app.put('/users/:email', async (req, res) => {
        const email = req.params.email;
        const user = req.body;
        const query = { email: email }
        const options = { upsert: true }
        const updateDoc = {
            $set: user
        }
        const result = await usersCollection.updateOne(query, updateDoc, options)
        console.log(result)
        res.send(result)
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('REELIFY SERVER IS RUNNING...')
})

app.listen(port, () => {
    console.log(`REELIFY running on http://localhost:${port}`)
})