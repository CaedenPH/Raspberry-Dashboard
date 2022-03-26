const jwt = require("jsonwebtoken");

module.exports = (request, response, next) => {
    if (request.path === "/signin") {
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
