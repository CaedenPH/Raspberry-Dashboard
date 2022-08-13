const { cookie_value, jwt_secret } = require("./config.json");
const jwt = require("jsonwebtoken");

const fs = require("fs");

module.exports = async (request, response, next) => {
    if (request.path.includes(".")) {
        return;
    }

    var ip = String(request.ip).replace("::ffff:", "");
    fs.appendFileSync("logs/usage.txt", `${request.path} | ${ip} | ${request.protocol} | ${new Date().toUTCString()}\n`);
    
    var public = false;
    [
        "/ec2",
        "/login", 
        "/logs/network",
        "/logs/processes", 
        "/processes/dashboard", 
        "/processes/jesterbot", 
        "/processes/stealthybot", 
        "/statistics",
        "/storage", 
        "/error"
    ].forEach(item => {
        if (request.path.includes(item)) {
            public = true;
        }
    });
    
    var superior = false;
    try {
        jwt.verify(request.cookies["_fiojoweonfwouinwiunfuiw"] || "", "aoihfisoduhgoiahusSECRET_KEY");
        superior = true;
    } catch (err) {}
    
    if (["/protocols", "/reset"].includes(request.path)) {
        if (superior === true) {
            next();
        } else {
            response.redirect("/error?code=403&route=explicit");
        }
    } else if (request.path === "/" || public === true) {
        next();
    } else if (["usage", "messages", "console", "editor", "restart", "pull", "execute"].some(element => request.path.includes(element))) {
        try {
            jwt.verify(request.cookies[cookie_value] || "", jwt_secret);
            next();
        } catch (err) {
            response.redirect("/error?code=403&route=admin");
        }
    } else {
        next();
    }
}

