const sys = require('systeminformation');
const ejs = require('ejs');

const express = require('express');
const app = express();


app.set("view engine", "ejs")
app.get('/', async (req, res) => {
    res.render('index', {
        name: await sys.cpu()
    });
});


app.listen(8000, () => {
    console.log(`Listening at http://localhost:8000`);
}); 