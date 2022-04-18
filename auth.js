const cookie_value = require("./config.json").cookie_value;
const jwt = require("jsonwebtoken");

module.exports = (request, response, next) => {
    if (["/", "/statistics", "/logs", "/signin", "/jesterbot", "/stealthybot", "/dashboard", "storage"].includes(request.path)) {
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
            response.redirect("/signin");
        }
    }
}