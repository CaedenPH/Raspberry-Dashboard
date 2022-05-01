const { cookie_value } = require("./config.json");
const jwt = require("jsonwebtoken");

const fs = require("fs");

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (request, response, next) => {
    if (request.path.includes(".")) {
        return;
    }

    var ip = String(request.ip).replace("::ffff:", "");
    fs.appendFileSync("logs/usage.txt", `${request.path} | ${ip} | ${request.protocol} | ${new Date().toUTCString()}\n`);
    
    const user = await prisma.user.findUnique({
        where: { ip }
    });
    if (user === null) {
        if (! ["/verify", "/authorize"].includes(request.path)) {
            response.redirect("/verify");
            return;
        } else {
            next();
            return;
        }
    }

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
    
    if (request.path === "/verify") {
        if (user === null) {
            next();
        } else  {
            response.redirect("/error?code=403&route=verify");
        }
    } else if (["/protocols", "/reset"].includes(request.path)) {
        if (superior === true) {
            next();
        } else {
            response.redirect("/error?code=403&route=explicit");
        }
    } else if (user.admin === true || request.path === "/" || public === true) {
        next();
    } else if (request.path.includes("/edit/")) {
        var routes = request.path.split("/");
        if (user.name === routes[routes.length - 1] || superior === true) {
            next();
        } else {
            response.redirect("/error?code=403&route=edit");
        }
    } else if (["usage", "messages", "console", "editor", "restart", "pull", "execute"].some(element => request.path.includes(element))) {
        try {
            jwt.verify(request.cookies[cookie_value] || "", "aoihfisoduhgoiahusSECRET_KEY");
            next();
        } catch (err) {
            response.redirect("/error?code=403&route=admin");
        }
    } else {
        next();
    }
}

