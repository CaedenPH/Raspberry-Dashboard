const sys = require('systeminformation');
const bodyParser = require('body-parser');
const express = require('express');
const app = express();
const auth = require('./auth.js');
const jwt = require("jsonwebtoken");
const cookieParser = require('cookie-parser');
const exec = require('child_process').exec;
const { password } = require('./config.json')


app.use(bodyParser.json());
app.use(cookieParser());
app.set("view engine", "ejs");
app.use('/static', express.static(__dirname + '/static'));
app.use(auth);



app.get('/', async (req, res) => {
    res.render('index', {
        brand: await (await sys.cpu()).brand
    });
});

app.get("/signin", async (req, res) => {
    res.render('signin');
});

app.post("/signin", async (req, res) => {
    if (req.body.password && req.body.password === password) {
        res.cookie("_ashoisdhiozvsb", jwt.sign({
            username: "test123"
        }, "aoihfisoduhgoiahusSECRET_KEY", {
            expiresIn: 10800
        }), {
            httpOnly: true,
            secure: true,
            expiresIn: 10800
        });
        res.status(200).json({ message: "s" });
    } else {
        res.status(400).json({ message: "Bad Argument" });
    }
});

app.get("/reboot", async (req, res) => {
    exec('reboot')
});


app.listen(8000, () => {
    console.log(`Listening at http://localhost:8000`);
}); 