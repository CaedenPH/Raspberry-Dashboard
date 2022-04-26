const { cookie_value } = require("./config.json");
const jwt = require("jsonwebtoken");

const fs = require("fs");

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async (request, response, next) => {
    fs.appendFileSync("logs/usage.txt", `${request.path} | ${request.ip} | ${request.protocol} | ${new Date().toUTCString()}\n`)
    
    try {
        const user = await prisma.user.findUnique({
            where: { ip, }
        })
        console.log(user);
    } catch (error) {
        if (request.path !== "/verify") {
            response.redirect("/verify");
            return;
        }
    }
    
    if ([
        "/", 
        "/ec2",
        "/login", 
        "/logs/network",
        "/logs/processes", 
        "/processes/dashboard", 
        "/processes/jesterbot", 
        "/processes/stealthybot", 
        "/statistics",
        "/storage", 
        "/verify"
    ].includes(request.path)) {
        next();
    } else if (["/protocols", "/reset"].includes(request.path)) {
        try {
            jwt.verify(request.cookies["_fiojoweonfwouinwiunfuiw"] || "", "aoihfisoduhgoiahusSECRET_KEY");
            next();
        } catch (err) {
            response.redirect("/explicit");
        }
    } else {
        try {
            jwt.verify(request.cookies[cookie_value] || "", "aoihfisoduhgoiahusSECRET_KEY");
            next();
        } catch (err) {
            response.redirect("/login");
        }
    }
}