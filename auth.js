const jwt = require("jsonwebtoken");

module.exports = (request, response, next) => {
    if (["/", "/statistics", "/logs", "/signin"].includes(request.path)) {
        next();
    } else {
        try {
            jwt.verify(request.cookies._ashoisdhiozvsb || "", "aoihfisoduhgoiahusSECRET_KEY");
            next();
        } catch (err) {
            response.redirect("/signin");
        }
    }
}