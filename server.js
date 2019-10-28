const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const moment = require('moment');
const dayFormat = 'ddd, MMM Do YYYY';

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MONGO_URI, {useUnifiedTopology: true, useNewUrlParser: true});

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/test', function(req, res){
  res.json({test: new Date(moment().startOf('day'))})
})

const Schema = mongoose.Schema;

const exerciseSchema = new Schema({
  description: {type: String, required: true},
  duration: {type: Number, min: 0, required: true},
  date: {type: Date, default: new Date(moment().startOf('day'))}
});
const userSchema = new Schema({
  username: {type: String, required: true},
  exercise: {type: [exerciseSchema], required: true, default: []}
});

const exerciseModel = new mongoose.model('exercise', exerciseSchema);
const userModel = new mongoose.model('user', userSchema);

app.post('/api/exercise/new-user', function(req, res){
  var username = req.body.username;
  userModel.find({username}, function(err, existingData){
    if (err) return res.json({error: err});
    if (existingData.length > 0) return res.send('username already taken');
    var user = new userModel({username});
    user.save(function(error, data){
      if (error) return res.json({error});
      res.json({username: data.username, _id: data._id});
    });
  });
});

app.post('/api/exercise/add', function(req, res){
  try{
    console.log(req.body)
    var {userId, description, duration, date} = req.body;
    duration = parseFloat(duration);
    date = new Date(date);
    var exercise = new exerciseModel({description, duration, date});
    userModel.findByIdAndUpdate({_id: userId}, {$push: {exercise}}, {new: true}, function(err, data){
      if (err) return res.json({error: err});
      var exerciseData = data.exercise[data.exercise.length-1];
      res.json({username: data.username, 
                description: exerciseData.description, 
                duration: exerciseData.duration, 
                _id: data._id, 
                date: moment(exerciseData.date).format(dayFormat)});
    });
  }
  catch(error){
    res.json({error});
  }
});

app.get('/api/exercise/users', function(req, res){
  userModel.find({}).select('-exercise').exec(function(error, data){
    if (error) return res.json({error});
    res.send(data);
  });
});

app.get('/api/exercise/log', function(req, res){
  //req.query...
  userModel.find({$})
  /*userModel.aggregate([{$match: {_id: req.query.userId}},
                     {$unwind: '$exercise'},
                     {$project: {_id: '$_id', 
                                username: '$username', 
                                count: '$exercise.length',
                                log: '$exercise'}}],
                     function(error, data){
    if (error) return res.json({error});
    console.log(data);
    res.json(data);
  })*/
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})