const cookie_value = require("./config.json").cookie_value;
const jwt = require("jsonwebtoken");
const fs = require("fs");

module.exports = (request, response, next) => {
    if (["/", "/statistics", "/logs/network", "/logs/processes", "/login", "/jesterbot", "/stealthybot", "/dashboard", "/storage"].includes(request.path)) {
        fs.appendFileSync("logs/usage.txt", `${request.path} | ${request.ip} | ${request.protocol} | ${new Date().toUTCString()}\n`)
        next();
    } else if (["/protocols", "/reset"].includes(request.path)) {
        try {
            jwt.verify(request.cookies["_fiojoweonfwouinwiunfuiw"] || "", "aoihfisoduhgoiahusSECRET_KEY");
            fs.appendFileSync("logs/usage.txt", `${request.path} | ${request.ip} | ${request.protocol} | ${new Date().toUTCString()}\n`)
            next();
        } catch (err) {
            response.redirect("/explicit");
        }
    } else {
        try {
            jwt.verify(request.cookies[cookie_value] || "", "aoihfisoduhgoiahusSECRET_KEY");
            fs.appendFileSync("logs/usage.txt", `${request.path} | ${request.ip} | ${request.protocol} | ${new Date().toUTCString()}\n`)
            next();
        } catch (err) {
            response.redirect("/login");
        }
    }
}