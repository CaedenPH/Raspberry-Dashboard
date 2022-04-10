const cookieParser = require('cookie-parser');
const express = require('express');

const bodyParser = require('body-parser');
const app = express();
const auth = require('./auth.js');
const jwt = require("jsonwebtoken");
const password = require('./config.json').password;
const ws_token = require("./config.json").ws_token;

const fs = require('fs');
const webSocket = require('ws');

app.use(bodyParser.json());
app.use(cookieParser());
app.set("view engine", "ejs");
app.use('/static', express.static(__dirname + '/static'));
app.use('/assets', express.static(__dirname + '/assets'));
app.use(auth);

const server = require('http').createServer(app);
const wss = new webSocket.Server({ server:server });

const REQUEST = 0
const RESPONSE = 1
const IDENTIFY = 2
const EXECUTE = 3

function execute (command) {
    wss.clients.forEach(function each(client) {
        client.send(JSON.stringify({
            op: EXECUTE,
            d: command
        }));
        client.on("message", function incoming(message) {
            console.log(message);
            let data = JSON.parse(message);
            console.log(data);
            if (data.op !== EXECUTE) {
                return;
            }
            return data.d;
        });
    });
}

wss.on('connection', function connection(ws) {
    console.log('Client Connected!');
  
    ws.on('message', function incoming(message) {
        let data = JSON.parse(message);
        if (data.op === IDENTIFY) {
            if (data.token !== ws_token) {
                ws.close();
            }
        }
    });
});   

app.get('/', async (req, res) => {
    wss.clients.forEach(function each(client) {
        client.send(JSON.stringify({
            op: REQUEST,
            d: "/"
        }));

        client.on("message", function incoming(message) {
            let data = JSON.parse(message);
            if (data.op !== RESPONSE) {
                return
            }
            try {
                res.render('index', data.d);
            } catch (error) {}
        });
    });
});


app.get("/signin", async (req, res) => {
    res.render('signin');
});

app.get("/console", async (req, res) => {
    res.render('console');
});

app.get("/processes", async (req, res) => {
    var jesterbotStdout = execute("systemctl status jesterbot.service").stdout;
    const jesterbotStatus = jesterbotStdout[2].slice(jesterbotStdout[2].indexOf("Active")).split(' ')[1];
    const jesterbotDeployed = jesterbotStdout[2].slice(jesterbotStdout[2].indexOf("Active")).split(' ')[8];
    
    var stealthybotStdout = execute("systemctl status stealthybot.service").stdout;
    const stealthybotStatus = stealthybotStdout[2].slice(stealthybotStdout[2].indexOf("Active")).split(' ')[1];
    const stealthybotDeployed = stealthybotStdout[2].slice(stealthybotStdout[2].indexOf("Active")).split(' ')[8];
    
    var dashboardStdout = execute("systemctl status dashboard.service").stdout;
    const dashboardStatus = dashboardStdout[2].slice(dashboardStdout[2].indexOf("Active")).split(' ')[1];
    const dashboardDeployed = dashboardStdout[2].slice(dashboardStdout[2].indexOf("Active")).split(' ')[8];
    
    res.render('processes', {
        processes: {
            jesterbot: {
                status: jesterbotStatus,
                since: jesterbotDeployed,
                gradient: true ? jesterbotStatus === "active": false
            },
            stealthybot: {
                status: stealthybotStatus,
                since: stealthybotDeployed,
                gradient: true ? stealthybotStatus === "active": false
            },
            dashboard: {
                status: dashboardStatus,
                since: dashboardDeployed,
                gradient: true ? dashboardStatus === "active": false
            }
        }
    });
});

app.get("/statistics", async (req, res) => {
    res.render('statistics');
});

app.get("/logs", async (req, res) => {
    res.render('logs');
});

app.get("/logout", async (req, res) => {
    res.clearCookie("_ashoisdhiozvsb");
    res.redirect("/login");
});

app.post("/signin", async (req, res) => {
    if (req.body.password && req.body.password === password) {
        res.cookie("_ashoisdhiozvsb", jwt.sign({
            username: "test123"
        }, "aoihfisoduhgoiahusSECRET_KEY", {
            expiresIn: 10800
        }), {
            httpOnly: true,
            expiresIn: 10800
        });
        res.status(200).json({ message: "s" });
    } else {    
        res.status(400).json({ message: "Bad Argument" });
    }
});

app.get("/restart", async (req, res) => {
    var { unit } = req.query;
    if (!unit) {
        execute('sudo /sbin/reboot');
    }
    else {
        execute(`sudo systemctl restart ${unit}.service`);
        res.redirect("/processes");
    }
    
}); 

app.get("/execute", async (req, res) => {
    var { cmd } = req.query;

    const result = new Promise(resolve => {
        var output = execute(cmd);
        console.log(output);
        if (output.stderr) {
          resolve(output.stderr);
        } else {
          resolve(output.stdout);
        }
    });
    res.status(200).json({message: await result + ""});
});


server.listen(8080, () => {
    console.log("Listening at http://localhost:8080");
}); 


