const sys = require('systeminformation');
const ejs = require('ejs');

const express = require('express');
const app = express();

app.set("view engine", "ejs")
app.use('/static', express.static(__dirname + '/static'))


app.get('/', async (req, res) => {
    res.render('index', {
        brand: await (await sys.cpu()).brand
    });
});


app.listen(8000, () => {
    console.log(`Listening at http://localhost:8000`);
}); 