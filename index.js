const cookieParser = require('cookie-parser');
const exec = require('child_process').exec;
const express = require('express');

const sys = require('systeminformation');
const bodyParser = require('body-parser');
const app = express();
const auth = require('./auth.js');
const cron = require('node-cron');
const jwt = require("jsonwebtoken");
const password = require('./config.json').password;

const fs = require('fs');

app.use(bodyParser.json());
app.use(cookieParser());
app.set("view engine", "ejs");
app.use('/static', express.static(__dirname + '/static'));
app.use('/assets', express.static(__dirname + '/assets'));
app.use(auth);


app.get('/', async (req, res) => {
    const gen = sys.time()
    const cpu = await sys.cpu()
    const mem = await sys.mem()
    const os = await sys.osInfo()
    const load = await sys.currentLoad()
    const net = (await sys.networkInterfaces())[0]
    const date = new Date(gen.current)

    var minutes = date.getMinutes()
    if ( 10 >= minutes ) {
        minutes = "0" + minutes
    }
    const [d, h, m, _] = [gen.uptime / (3600*24), gen.uptime % (3600*24) / 3600, gen.uptime % 3600 / 60, gen.uptime % 3600 / 60].map((i) => Math.floor(i));
    const s = Math.round(gen.uptime % 60)

    
    fs.readFile('logs.txt', async(error, data) => {
        if (error) {
            console.log(error);
            return
        }
        var hourData = data.toString().trim().split("\n");
        
        const upload = hourData.map((item, index) => Math.round(Number(hourData[index].split(" | ")[2]) / 100000)).slice(hourData.length - 7).reverse();
        const download = hourData.map((item, index) => Math.round(Number(hourData[index].split(" | ")[1]) / 1000000)).slice(hourData.length - 7).reverse();
        const ping = Math.round(Number(hourData[hourData.length - 1].split(" | ")[0]));
        var pingDifference = String(Math.round((ping / Number(hourData[hourData.length - 2].split(" | ")[0]) * 100)) / 100);
        if (pingDifference >= 0) { pingDifference = "+" + pingDifference; }

        res.render('index', {
            general: {
                localTime: {
                    Long: date.toLocaleString("en-US", {timeZoneName: "short"}),
                    hourSeconds: date.getHours() + ":" + minutes,
                },
                uptimeHours: Math.round((gen.uptime / 3600) * 10, 2) / 10,
                uptimeLong: `${d} days, ${h} hours, ${m} minutes and ${s} seconds.`,
                timezone: {
                    time: gen.timezone,
                    name: gen.timezoneName
                },
            },
            cpu: {
                manufacturer: cpu.manufacturer,
                brand: cpu.brand,
                speedMin: cpu.speedMin,
                speedMax: cpu.speedMax,
                cores: cpu.cores,
                socket: cpu.socket,
                model: cpu.model,
                volate: cpu.voltage,
                cache: cpu.cache,
                currentSpeed: (await sys.cpuCurrentSpeed()).cores,
                temp: (await sys.cpuTemperature()).cores,
            },
            memory: {
                total: mem.total,
                free: mem.free,
                used: mem.used,
                active: mem.active,
                available: mem.available,
            },
            os: {
                platform: os.platform,
                distro: os.distro,
                kernel: os.kernel,
                release: os.release,
                arch: os.arch,
            },
            currentLoad: { // graph stuff
                avgLoad: load.avgLoad,
                currentLoad: load.currentLoad,
                currentLoadUser: load.currentLoadUser,
                currentLoadSystem: load.currentLoadSystem,
                currentLoadIdle: load.currentLoadIdle,
                cpus: load.cpus
            },
            network: {
                ip4: net.ip4,
                ip6: net.ip6,   
                mac: net.mac,
                upload: upload,
                download: download,
                ping: ping,
                pingDifference: pingDifference
            }
        });
    })
});


app.get("/signin", async (req, res) => {
    res.render('signin');
});

app.get("/console", async (req, res) => {
    res.render('console');
});

app.get("/processes", async (req, res) => {
    res.render('processes');
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
    exec('sudo /sbin/reboot', (error, stdout, stderr) => {
        console.log(error);
    });
}); 

app.get("/execute", async (req, res) => {
    var { cmd } = req.query
    const result = new Promise(resolve => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          resolve(error.message);
        } else {
          resolve(stdout);
        }
      });
    });
    res.status(200).json({message: await result + ""});
});


cron.schedule('0 * * * *', async () => {
    console.log("Logging"); 
    exec("speedtest --json", (error, stdout, stderr) => {
        if (error || stderr) {
            console.log(`Error ${error}`)
            return
        }
        const speed = JSON.parse(stdout);
        console.log(speed);
        fs.appendFile('logs.txt', `${speed.ping} | ${speed.download} | ${speed.upload}\n`, error => {
            if (error) {
                console.log(error);
                return
            }
        });
    });
    
});


app.listen(8080, () => {
    console.log("Listening at http://localhost:8080");
}); 

