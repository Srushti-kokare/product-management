const express = require('express');
const bodyParser = require('body-parser');
const route = require('./route/route');
const mongoose = require('mongoose');
const multer = require('multer')
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer().any())
app.use('/', route);

mongoose.connect("mongodb+srv://nasirhussain7878:llo5gS70CAxajLIs@cluster0.neahs.mongodb.net/group9Database", {useNewUrlParser: true})
.then(() => console.log('Successfully connected to mongoDB 27017'))
.catch(err => console.log('Connection error'))

app.listen(process.env.PORT || 3000, function() {
    console.log('Express app running on port ' + (process.env.PORT || 3000));
});

