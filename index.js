const cookieParser = require('cookie-parser');
const exec = require('child_process').exec;
const express = require('express');

const sys = require('systeminformation');
const bodyParser = require('body-parser');
const app = express();
const auth = require('./auth.js');
const jwt = require("jsonwebtoken");
const { password } = require('./config.json')


app.use(bodyParser.json());
app.use(cookieParser());
app.set("view engine", "ejs");
app.use('/static', express.static(__dirname + '/static'));
app.use(auth);


app.get('/', async (req, res) => {
    const gen = await sys.time()
    const cpu = await sys.cpu()
    const mem = await sys.mem()
    const os = await sys.osInfo()
    const load = await sys.currentLoad()
    const net = (await sys.networkInterfaces())[0]

    res.render('index', {
        general: {
            localTime: gen.current,
            uptime: gen.uptime,
            timezone: {
                time: gen.timezone,
                name: gen.timezoneName
            }
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
            currentSpeed: await sys.cpuCurrentSpeed().avg,
            temp: await sys.cpuTemperature().avg
        },
        memory: {
            total: mem.total,
            free: mem.free,
            used: mem.used,
            active: mem.active,
            available: mem.available,
        },
        os: {
            platforM: os.platform,
            distro: os.distro,
            kernel: os.kernel,
            release: os.release,
            arch: os.arch,
            hostname: os.hostname,
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
            speed: net.speed,
        }
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
            expiresIn: 10800
        });
        res.status(200).json({ message: "s" });
    } else {    
        res.status(400).json({ message: "Bad Argument" });
    }
});

app.get("/reboot", async (req, res) => {
    exec('sudo /sbin/reboot', (error, stdout, stderr) => {
        console.log(error)
      });
});

app.get("/execute", async (req, res) => {
    var { cmd } = req.query
    console.log(cmd)
    const result = new Promise(resolve => {
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          resolve(error.message);
        } else {
          resolve(stdout);
        }
      });
    });
    console.log(await result)
    res.status(200).json({ message: await result });
});


app.listen(8000, () => {
    console.log(`Listening at http://localhost:8000`);
}); 
