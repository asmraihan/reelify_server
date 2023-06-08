const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
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

// middleware function to verify jwt
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization
  if(!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorized access' })
  }
  const token = authorization.split(' ')[1]
  console.log(token)
  // token verify
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'Unauthorized access' })
    }
    req.decoded = decoded
    next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    client.connect();

    const usersCollection = client.db("reelifyDB").collection("users");
    const classesCollection = client.db("reelifyDB").collection("classes");
    const enrollsCollection = client.db("reelifyDB").collection("enrolls");

    //Generate JWT
    app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
      res.send({ token })
    })


    // ?users apis
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

    // get a user by email
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: email }
      const result = await usersCollection.findOne(query)
      res.send(result)
    })

    // get all instructors by role
    app.get('/instructors', async (req, res) => {
      const query = { role: 'instructor' }
      const result = await usersCollection.find(query).toArray()
      res.send(result)
    })


    //? class apis
    // save a class in db
    app.post('/classes', async (req, res) => {
      const newClass = req.body;
      console.log(newClass)
      const result = await classesCollection.insertOne(newClass)
      res.send(result)
    })

    // get all approved class
    app.get('/classes', async (req, res) => {
      const query = { status: 'approved' }
      const result = await classesCollection.find(query).toArray()
      res.send(result)
    })


    //   app.get('/rooms/:email', verifyJWT, async (req, res) => { /* req er moddeh amra jwt er decoded add kore disi */
    //   const decodedEmail = req.decoded.email
    //   // console.log(decodedEmail)
    //   const email = req.params.email
    //   if (email !== decodedEmail) {
    //     return res.status(403).send({ error: true, message: 'Forbidden access' })
    //   }
    //   const query = { 'host.email': email }
    //   const result = await roomsCollection.find(query).toArray()
    //   res.send(result)
    // })

    //get classes by instructor email
    app.get('/classes/:email', verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email
      const email = req.params.email
      if(email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbidden Access' })
      }
      const query = { email: email }
      const result = await classesCollection.find(query).toArray()
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