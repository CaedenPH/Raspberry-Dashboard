#include <iostream>
#include <jwt-cpp/jwt.h>
#include "includes/crow_all.h"

auto config_file = crow::json::load("{\n"
                                    "    \"jwt_token\": \"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c\",\n"
                                    "    \"cookie_sec\": \"some_cookie\"\n"
                                    "}");

const std::string jwt_secret = static_cast<std::string>(config_file["jwt_token"]);
const std::string cookie_value = static_cast<std::string>(config_file["cookie_sec"]);

crow::App<crow::CookieParser> app;

auto verifier = jwt::verify()
                    .with_issuer("auth0")
                    .allow_algorithm(jwt::algorithm::hs256{jwt_secret});



int main()
{
    CROW_ROUTE(app, "/login").methods(crow::HTTPMethod::POST)
    (
        [](const crow::request &req, crow::response& res)
        {
            auto &ctx = app.get_context<crow::CookieParser>(req);
            std::string secret = ctx.get_cookie("_fiojoweonfwouinwiunfuiw");
            try
            {
                verifier.verify(jwt::decode(secret));
            }
            catch (jwt::error::token_verification_exception &_)
            {
                res = crow::response(401);
                res.end();
            }
            res = crow::response(200);
            res.end();

        });

    app.port(18080).run();
}