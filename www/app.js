const MongoClient = require('mongodb').MongoClient
const assert = require('assert')
const url = 'mongodb://localhost:27017'
const dbName = 'test'
const dbClient = new MongoClient(url)
var collection = null
var dbConnected = false
var db = null
dbClient.connect(function(err){
  assert.equal(null, err)
  console.log("Connected successfully to mongodb server")
  db = dbClient.db(dbName)
  collection = db.collection('timeseries')
  dbConnected = true
})

const express = require('express')
const { pathToFileURL } = require('url')
const { isRegExp } = require('util')
const app = express()
const port = 3000
const maxDocuments = 10000

app.get('/', (req, res) => {
  filePath = __dirname + '/public/index.html'
  res.sendFile(filePath)
})

app.get('/favicon.ico', (req, res) => {
  filePath = __dirname + '/public/images/favicon.ico'
  res.sendFile(filePath)
})

app.get('/api/listDevices',(req, res) => {
  db.collection('timeseries').distinct("deviceId",(err,documents)=>{
    if (err)
      throw err
    res.send(documents)
  })
})

app.get('/api/listTags',(req, res) => {
  db.collection('timeseries').distinct("tag",(err,documents)=>{
    if (err)
      throw err
    res.send(documents)
  })
})

app.get('/api/count',(req,res) =>{
  var query = {}
  if(req.query.deviceId)
    query.deviceId = req.query.deviceId
  if(req.query.tag)
    query.tag = req.query.tag
  if(req.query.start && req.query.start == parseInt(req.query.start)){
    query.timestamp = {
      $gte:parseInt(req.query.start)
    }
  }
  if(req.query.end && req.query.end == parseInt(req.query.end)){
    if(query.hasOwnProperty('timestamp')){
      query.timestamp.$lte = parseInt(req.query.end)
    }else{
      query.timestamp = {
        $lte:parseInt(req.query.end)
      }
    }
  }
  db.command({
    count:'timeseries',
    query:query
  },(err, documents) =>{
    if (err)
      throw err
    res.send(documents)
  })
})

app.get('/api/timeseries', (req, res) =>{
  var projection = {
    '_id': 0, 
    'dataType': 0
  }
  var sort = {
    timestamp:1
  }
  var filters = {}
  if(req.query.deviceId){
    filters.deviceId = req.query.deviceId
  }
  if(req.query.start && req.query.start == parseInt(req.query.start)){
    filters.timestamp = {
      $gte:parseInt(req.query.start)
    }
  }
  if(req.query.end && req.query.end == parseInt(req.query.end)){
    if(filters.hasOwnProperty('timestamp')){
      filters.timestamp.$lte = parseInt(req.query.end)
    }else{
      filters.timestamp = {
        $lte:parseInt(req.query.end)
      }
    }
  }
  if(req.query.tag)
    filters.tag = req.query.tag
  console.log(`find filters: ${JSON.stringify(filters)}`)
  var cursor = db.collection('timeseries').find(filters,{projection:projection,limit:maxDocuments,sort:sort}).toArray((err,documents)=>{
    if (err)
      throw err
    res.send(documents)
  })
})

app.use(express.static('public'))

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`)
})