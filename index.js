const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'Unauthorized access' })
  }
  const token = authorization.split(' ')[1]
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
    // client.connect();

    const usersCollection = client.db("reelifyDB").collection("users");
    const classesCollection = client.db("reelifyDB").collection("classes");
    const selectedCollection = client.db("reelifyDB").collection("selected");
    const enrolledCollection = client.db("reelifyDB").collection("enrolls");

    //Generate JWT
    app.post('/jwt', async (req, res) => {
      const email = req.body
      const token = jwt.sign(email, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '7d' })
      res.send({ token })
    })


    //? usersCollection apis

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

    // get all users excluding current user
    app.get('/admin/allusers/:email', async (req, res) => {
      const email = req.params.email
      const query = { email: { $ne: email } }
      const result = await usersCollection.find(query).toArray()
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

    // get all instructor by role and limit it to 6 data
    app.get('/instructors/sort', async (req, res) => {
      const query = { role: 'instructor' }
      const result = await usersCollection.find(query).limit(6).toArray()
      res.send(result)
    })

    // set role to instructor
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'instructor'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // set role to admin
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updateDoc)
      res.send(result)
    })


    /*  check if admin */
    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const result = { admin: user?.role === 'admin' }
      res.send(result)
    })

    /*  check if instructor */
    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ instructor: false })
      }
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      const result = { instructor: user?.role === 'instructor' }
      res.send(result)
    })


    //? classesCollection apis

    // save a class in db
    app.post('/classes', async (req, res) => {
      const newClass = req.body;
      console.log(newClass)
      const result = await classesCollection.insertOne(newClass)
      res.send(result)
    })

    // get all classes
    app.get('/allclasses', async (req, res) => {
      const result = await classesCollection.find().toArray()
      res.send(result)
    })

    // get all approved class
    app.get('/classes', async (req, res) => {
      const query = { status: 'approved' }
      const result = await classesCollection.find(query).toArray()
      res.send(result)
    })

    // get all approved class and sort by student count and limit it to 6 data
    app.get('/classes/sort', async (req, res) => {
      const query = { status: 'approved' }
      const result = await classesCollection.find(query).sort({ students: -1 }).limit(6).toArray()
      res.send(result)
    })

    //get classes by instructor email
    app.get('/classes/:email', verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email
      const email = req.params.email
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbidden Access' })
      }
      const query = { email: email }
      const result = await classesCollection.find(query).toArray()
      res.send(result)
    })


    // set class status as approved
    app.patch('/classes/approved/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: 'approved'
        }
      }
      const result = await classesCollection.updateOne(filter, updateDoc)
      res.send(result)
    })

    // set class status as approved
    app.patch('/classes/denied/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: 'denied'
        }
      }
      const result = await classesCollection.updateOne(filter, updateDoc)
      res.send(result)
    })


    //post a feedback to a class
    app.put('/feedback/:id', async (req, res) => {
      const { text } = req.body
      const id = req.params.id;
      console.log(id, text)
      const filter = { _id: new ObjectId(req.params.id) }
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          feedback: text,
        }
      }
      const result = await classesCollection.updateOne(filter, updateDoc, options)
      res.send(result)
    })

    //? selectedCollection apis

    // save selected class in db by student
    app.post('/selected', async (req, res) => {
      const item = req.body;
      const result = await selectedCollection.insertOne(item);
      res.send(result);
    })

    // get all selected class by student by email
    app.get('/selected/:email', verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email
      const email = req.params.email
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbidden Access' })
      }
      const query = { email: email }
      const result = await selectedCollection.find(query).toArray()
      res.send(result)
    })

    //get a single classe from selected by classid id
    app.get('/select/:classId', async (req, res) => {
      const classId = req.params.classId;
      console.log(classId)
      const query = { classId: classId }
      const result = await selectedCollection.findOne(query)
      res.send(result)
    })

    //delete selected class by student
    app.delete('/selected/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await selectedCollection.deleteOne(query)
      res.send(result)
    })

    //create payment intent
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100)
      console.log(price, amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    //? enrolledCollection apis (enrolls)

    // add a class to enrolled collection
    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body;
      // console.log(payment)

      const insetResult = await enrolledCollection.insertOne(payment)

      const query = { classId: payment.classId }
      // console.log('delete ckeck query',query)
      const deleteResult = await selectedCollection.deleteOne(query)

      // decrease available seat by 1 in classes collection 
      const classQuery = { _id: new ObjectId(payment.classId) };
      // const query = { classId: classId }
      const classUpdate = {
        $inc: {
          seats: -1
        }
      }
      const classUpdateResult = await classesCollection.updateOne(classQuery, classUpdate);

      res.send({ insetResult, deleteResult, classUpdateResult })
    })

    // get all enrolled class by student by email
    app.get('/enrolled/:email', verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email
      const email = req.params.email
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbidden Access' })
      }
      const query = { user: email }
      const result = await enrolledCollection.find(query).sort({ date: -1 }).toArray()
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