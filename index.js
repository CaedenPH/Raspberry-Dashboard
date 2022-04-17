const cookieParser = require('cookie-parser');
const exec = require('child_process').exec;
const express = require('express');

const app = express();
const auth = require('./auth.js');
const jwt = require("jsonwebtoken");
const bodyParser = require('body-parser');
const { password, explicit_password, ws_token, cookie_value } = require('./config.json');

const webSocket = require('ws');
const crypto = require("crypto");
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

async function request (client, outgoingData) {
    client.send(JSON.stringify(outgoingData));
        
    result = new Promise(resolve => {
        client.on("message", (message) => {
            let data = JSON.parse(message);
            if (data.op !== RESPONSE) {
                return;
            }
            resolve(data.d);
        });
        client.removeEventListener("message");
    });
    return await result;
}

async function execute (command) {
    const [ client ] = wss.clients;
    if (client === undefined) {
        result = new Promise(resolve => {
            resolve({stdout: undefined, stderr: undefined});
        });
        return await result;
    } else {
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
            client.removeEventListener("message");
        });
        return await result;
    }
}

wss.on('connection', (client) => {
    console.log('Client Connected!');
    
    client.send(JSON.stringify({op: IDENTIFY}));
    client.on('message', (message) => {
        let data = JSON.parse(message);
        if (data.op === IDENTIFY) {
            if (data.token === ws_token) {
                client.setMaxListeners(0);
            } else { client.close(); }
        }
    });
    client.on('close', (reasonCode, description) => {
        console.log('Client Disconnected!');
    });
});   


app.get('/', async (req, res) => {
    const [ client ] = wss.clients;

    if (client === undefined) {
        res.render('offline');
    } else {
        data = await request(client, {
            op: REQUEST,
            d: "base"
        });
        res.render('index', data);
    }
});


app.get("/signin", async (req, res) => {
    res.render('signin');
});

app.get("/console", async (req, res) => {
    res.render('console');
});

app.get("/jesterbot", async (req, res) => {
    const [ client ] = wss.clients;

    if (client === undefined) {
        res.render('offline');
    } else {
        data = await request(client, {
            op: REQUEST,
            d: "jesterbot"
        });
        res.render('jesterbot', data);
    }
});

app.get("/stealthybot", async (req, res) => {
    const [ client ] = wss.clients;

    if (client === undefined) {
        res.render('offline');
    } else {
        data = await request(client, {
            op: REQUEST,
            d: "stealthybot"
        });
        res.render('stealthybot', data);
    }
});

app.get("/dashboard", async (req, res) => {
    const [ client ] = wss.clients;

    if (client === undefined) {
        res.render('offline');
    } else {
        data = await request(client, {
            op: REQUEST,
            d: "dashboard"
        });
        console.log(data);
        res.render('dashboard', data);
    }
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

app.get("/explicit", async (req, res) => {
    res.render('explicit');
})

app.get("/protocols", async (req, res) => {
    res.render('protocols');    
})

app.get("/logout", async (req, res) => {
    res.clearCookie(cookie_value);
    res.redirect("/signin");
});

app.get("/statistics", async (req, res) => {
    try {
        jwt.verify(req.cookies._ashoisdhiozvsb || "", "aoihfisoduhgoiahusSECRET_KEY");
        var verified = true
    } catch (error) { let verified = false }

    const [ client ] = wss.clients;

    if (client === undefined) {
        res.render('offline');
    } else {
        data = await request(client, {
            op: REQUEST,
            d: "statistics",
            v: verified
        });
        res.render('statistics', data);
    }
});

app.get("/pull", async(req, res) => {
    res.redirect("/");
    exec("git stash && git pull");
})

app.get("/reset", async (req, res) => {
    var { password } = req.query;

    var cookieValue = crypto.randomBytes(20).toString('hex');
    var fileContent = JSON.parse(fs.readFileSync("./config.json"));
    fileContent.cookie_value = cookieValue;
    fileContent.password = password;
    
    fs.writeFileSync("./config.json", JSON.stringify(fileContent, null, 4));
});

app.get("/restart", async (req, res) => {
    var { unit } = req.query;
    if (!unit) {
        res.redirect("/");
        await execute('sudo /sbin/reboot');
    }
    else {
        res.redirect("/" + unit);
        await execute(`sudo systemctl restart ${unit}.service`);
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
        res.cookie(cookie_value, jwt.sign({
            username: "username"
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

app.post("/explicit", async (req, res) => {
    if (req.body.password && req.body.password === explicit_password) {
        res.cookie("_fiojoweonfwouinwiunfuiw", jwt.sign({
            username: "explicit_username"
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


