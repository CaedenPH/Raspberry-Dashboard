const cookieParser = require('cookie-parser');
const exec = require('child_process').exec;
const express = require('express');

const app = express();
const auth = require('./auth.js');
const jwt = require("jsonwebtoken");
const bodyParser = require('body-parser');
const { password, explicit_password, ws_token, cookie_value } = require('./config.json');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

async function request (req, client, outgoingData) {
    outgoingData.ipFrom = String(req.ip).replace("::ffff:", "");

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

async function execute (req, command) {
    const [ client ] = wss.clients;
    
    if (client === undefined) {
        result = new Promise(resolve => {
            resolve({stdout: undefined, stderr: undefined});
        });
        return await result;
    } else {
        client.send(JSON.stringify({
            op: EXECUTE,
            d: command,
            ipFrom: String(req.ip).replace("::ffff:", "")
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

    const t = setTimeout(() => {
        console.log('Client force kicked!');
        client.close();
    }, 30000);

    client.send(JSON.stringify({op: IDENTIFY}));
    client.on('message', (message) => {
        let data = JSON.parse(message);
        if (data.op === IDENTIFY) {
            if (data.token === ws_token) {
                clearTimeout(t);
                client.setMaxListeners(0);
            }
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
        data = await request(req, client, {
            op: REQUEST,
            d: "home"
        });
        res.render('home', data);
    }
});

app.get("/:static_page(login|console|verify|logs|editor|ec2|excplicit|protocols)", async (req, res) => {
    res.render(req.params.static_page);
});  

app.get("/:ws_page(storage|jesterbot|stealthybot|dashboard|messages|network)", async (req, res) =>{
    const [ client ] = wss.clients;
    
    var routes = string.split("/");
    var endpoint = routes[routes.length - 1];
    
    if (client === undefined) {
        res.render('offline');
    } else {
        data = await request(req, client, {
            op: REQUEST,
            d: endpoint
        });
        res.render(endpoint, data);
    }
});

app.get("/logs/usage", async (req, res) => {
    var fileContent = fs.readFileSync("logs/usage.txt")
    data = {
        usage: fileContent
    }
    res.render('logs/usage', data);
});

});

app.get("/logs/processes", async (req, res) => {
    jesterbotLogs = (await execute(req, "journalctl -b -u jesterbot.service")).stdout;
    stealthybotLogs = (await execute(req, "journalctl -b -u stealthybot.service")).stdout;
    dashboardLogs = (await execute(req, "journalctl -b -u raspberry-dashboard.service")).stdout;

    res.render('logs/processes', {
        processes: {
            jesterbot: jesterbotLogs,
            stealthybot: stealthybotLogs,
            dashboard: dashboardLogs
        }
    });
});

app.get("/logout", async (req, res) => {
    res.clearCookie(cookie_value);
    res.redirect("/login");
});

app.get("/user/:username", async (req, res) => {
    var username = req.params.username;
    const user = await prisma.user.findUnique({
        where: { 
            name: username, 
        }
    });
    console.log(user);
    if (user !== null) {
        res.render('user', user);
        return;
    }
    res.render('404');
})

app.get("/statistics", async (req, res) => {
    var verified = false;
    try {
        jwt.verify(req.cookies[cookie_value] || "", "aoihfisoduhgoiahusSECRET_KEY");
        verified = true;
    } catch (error) {}

    const [ client ] = wss.clients;

    if (client === undefined) {
        res.render('offline');
    } else {
        data = await request(req, client, {
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
});

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
        await execute(req, 'sudo /sbin/reboot');
    }
    else {
        res.redirect("/" + unit);
        await execute(req, `sudo systemctl restart ${unit}.service`);
    }
}); 

app.get("/execute", async (req, res) => {
    var { cmd } = req.query;
    
    var output = await execute(req, cmd);
    const result = new Promise(resolve => {
        if (output.stderr) {
          resolve(output.stderr);
        } else {
          resolve(output.stdout);
        }
    });
    res.status(200).json({message: await result + ""});
});

app.post("/login", async (req, res) => {
    console.log("e");
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

app.post("/authorize", async (req, res) => {
    var ip = String(req.ip).replace("::ffff:", "");
    const user = await prisma.user.findUnique({
        where: { ip, }
    });
    
    if (user !== null) {
        return;
    }
        
    await prisma.user.create({
        data: {
            name: req.body.name,
            usage: req.body.usage,
            ip: ip,
            visits: "",
            admin: false
        }
    });
    res.redirect("/");
});

server.listen(8080, () => {
    console.log("Listening at http://localhost:8080");
}); 


