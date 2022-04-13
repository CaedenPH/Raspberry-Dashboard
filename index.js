const cookieParser = require('cookie-parser');
const exec = require('child_process').exec;
const express = require('express');

const app = express();
const auth = require('./auth.js');
const jwt = require("jsonwebtoken");
const bodyParser = require('body-parser');
const password = require('./config.json').password;
const wsToken = require("./config.json").ws_token;

const webSocket = require('ws');
const fs = require('fs');

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

async function execute (command) {
    const [ client ] = wss.clients;
    client.send(JSON.stringify({
        op: EXECUTE,
        d: command
    }));    
        
    result = new Promise(resolve => {
        client.on("message", (message) => {
            let data = JSON.parse(message);
            if (data.op !== EXECUTE) {
                return;
            }
            resolve(data.d);
        });
    });
    return await result;
}

wss.on('connection', (client) => {
    console.log('Client Connected!');
    
    client.send(JSON.stringify({op: IDENTIFY}));
    client.on('message', (message) => {
        let data = JSON.parse(message);
        if (data.op === IDENTIFY) {
            if (data.token === wsToken) {
                client.setMaxListeners(0);
            } else { client.close(); }
        }
    });
    client.on('close', (reasonCode, description) => {
        console.log('Client Disconnected!');
    });
});   


app.get('/', async (req, res) => {
    try {
        const [ client ] = wss.clients;
    
        client.send(JSON.stringify({
            op: REQUEST,
            d: "/"
        }));
        client.on("message", (message) => {
            let data = JSON.parse(message);
            if (data.op !== RESPONSE) {
                return
            }
            try {
                res.render('index', data.d);
            } catch (error) {}
        });
    }
    catch (error) {}
});


app.get("/signin", async (req, res) => {
    res.render('signin');
});

app.get("/console", async (req, res) => {
    res.render('console');
});

app.get("/statistics", async (req, res) => {
    res.render('statistics', {
        
    });
});

app.get("/logs", async (req, res) => {
    jesterbotLogs = (await execute("journalctl -b -u jesterbot.service")).stdout;
    stealthybotLogs = (await execute("journalctl -b -u stealthybot.service")).stdout;
    dashboardLogs = (await execute("journalctl -b -u raspberry-dashboard.service")).stdout;

    res.render('logs', {
        processes: {
            jesterbot: jesterbotLogs,
            stealthybot: stealthybotLogs,
            dashboard: dashboardLogs
        }
    });
});

app.get("/editor", async (req, res) => {
    res.render('editor');
});

app.get("/protocols", async (req, res) => {
    res.render('protocols');
})

app.get("/logout", async (req, res) => {
    res.clearCookie("_ashoisdhiozvsb");
    res.redirect("/login");
});

app.get("/processes", async (req, res) => {
    var jesterbotStdout = ((await execute("systemctl status jesterbot.service")).stdout).split('\n');
    const jesterbotStatus = jesterbotStdout[2].slice(jesterbotStdout[2].indexOf("Active")).split(' ')[1];
    const jesterbotDeployed = jesterbotStdout[2].slice(jesterbotStdout[2].indexOf("Active")).split(' ')[8];
    
    var stealthybotStdout = ((await execute("systemctl status stealthybot.service")).stdout).split('\n');
    const stealthybotStatus = stealthybotStdout[2].slice(stealthybotStdout[2].indexOf("Active")).split(' ')[1];
    const stealthybotDeployed = stealthybotStdout[2].slice(stealthybotStdout[2].indexOf("Active")).split(' ')[8];
    
    var dashboardStdout = ((await execute("systemctl status raspberry-dashboard.service")).stdout).split('\n');
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

app.get("/pull", async(req, res) => {
    res.redirect("/");
    exec("git stash && git pull");
})

app.get("/restart", async (req, res) => {
    var { unit } = req.query;
    if (!unit) {
        res.redirect("/");
        await execute('sudo /sbin/reboot');
    }
    else {
        await execute(`sudo systemctl restart ${unit}.service`);
        res.redirect("/processes");
    }
}); 

app.get("/execute", async (req, res) => {
    var { cmd } = req.query;

    var output = await execute(cmd);
    const result = new Promise(resolve => {
        if (output.stderr) {
          resolve(output.stderr);
        } else {
          resolve(output.stdout);
        }
    });
    res.status(200).json({message: await result + ""});
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

server.listen(8080, () => {
    console.log("Listening at http://localhost:8080");
}); 


