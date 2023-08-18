const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use(express.static('public'));

const userSchema = new mongoose.Schema({
  username: String,
  count: { type: Number, default: 0 },
  log: {
    type: Array,
    default: [],
  },
});

const User = mongoose.model('User', userSchema);

//initial route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users); // sending the array
  } catch (err) {
    res.send('No users found');
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    const { _id } = newUser;
    res.json({ username, _id });
  } catch (error) {
    res.send("Couldn't add new user");
  }
});

//exercise routes
app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { description, date, duration } = req.body;
    const { _id } = req.params;
    const dateObj = new Date(date);
    const userObj = await User.findById({ _id });
    const logObj = {
      description,
      duration: Number(duration),
      date:
        dateObj == 'Invalid Date'
          ? new Date().toDateString()
          : dateObj.toDateString(),
    };
    userObj.log.push(logObj);
    userObj.count += 1;
    await userObj.save();
    const { username } = userObj;
    res.json({ username, ...logObj, _id });
  } catch (err) {
    res.send('Check your values and try again');
  }
});

//log routes
app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const {
      params: { _id },
      query: { from, to, limit },
    } = req;
    const userObj = await User.findById({ _id }, { __v: 0 });
    let { log } = userObj;
    // since the from, to, limit are optional query parameters
    if (from) {
      const fromDate = new Date(from).getTime();
      if (fromDate === NaN)
        return res.send("Please input a valid date for 'from'");
      log = log.filter((item) => fromDate <= new Date(item.date).getTime());
    }
    if (to) {
      const toDate = new Date(to).getTime();
      if (toDate === NaN) return res.send("Please input a valid date for 'to'");
      log = log.filter((item) => toDate >= new Date(item.date).getTime());
    }
    if (limit) {
      if (isNaN(limit))
        return res.send('Please provide a valid number for "limit"');
      log = log.slice(0, Number(limit));
    }
    res.json({ ...userObj._doc, log });
    // res.json({ ...({ username, id, count } = userObj) });
  } catch (err) {
    console.error(err);
    res.send(`${err.message}`);
  }
});

mongoose
  .connect(process.env.DB_CONNECTION_STRING)
  .then(() => {
    const listener = app.listen(process.env.PORT || 3000, () => {
      console.log('Your app is listening on port ' + listener.address().port);
    });
  })
  .catch((err) => console.error(err));
