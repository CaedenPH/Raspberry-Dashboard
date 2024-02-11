// stdlib
#include <iostream>
#include <cstring>
#include <iomanip>
#include <string>

// crypto
// #include <jwt-cpp/jwt.h>
#include <openssl/sha.h>

// db
#include <soci/soci.h>
#include <soci/sqlite3/soci-sqlite3.h>

// web
#define CROW_DISABLE_STATIC_DIR // disable static serving
#include "crow_all.h"


crow::App<crow::CookieParser, crow::CORSHandler> app;


soci::session db(soci::sqlite3, "userdb");

bool verify_pass(const std::string &username, const std::string &password)
{
    unsigned char hashed_username[SHA256_DIGEST_LENGTH], hashed_password[SHA256_DIGEST_LENGTH];
    SHA256(reinterpret_cast<const unsigned char *>(username.c_str()), username.size(), hashed_username);
    SHA256(reinterpret_cast<const unsigned char *>(password.c_str()), password.size(), hashed_password);

    std::stringstream username_stream, password_stream;

    for (int i{0}; i < SHA256_DIGEST_LENGTH; i++)
    {
        username_stream << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(hashed_username[i]);
        password_stream << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(hashed_password[i]);
    }

    std::string pass;
    db << "select password from accounts where username = '" << username_stream.str() << "'", soci::into(pass);

    if (!pass.empty() && pass == password_stream.str())
    {
        return true;
    }
    else
    {
        return false;
    }
}

int main()
{
    CROW_ROUTE(app, "/")
    ([](crow::response &res){
        res.set_static_file_info("static/index.html");

        // set response code to 200 and end the resp
        // rest will be handled by angular
        res.code = 200;
        res.end();
    });

    CROW_ROUTE(app, "/login").methods(crow::HTTPMethod::POST)
    ([](const crow::request &req, crow::response &res){
        std::string auth = req.get_header_value("Authorization");
        std::string credentials = auth.substr(6);
        std::cout << credentials << std::endl;
        credentials = crow::utility::base64decode(credentials, credentials.size());
        size_t colon = credentials.find(':');
        std::string username = credentials.substr(0, colon), password = credentials.substr(colon+1);
        res.code = verify_pass(username, password) ? 200 : 401;
        res.end(); 
        }
    );

    // override static file serving
    CROW_ROUTE(app, "/<path>")
    ([](const crow::request &req, crow::response &res, std::string path) {
        crow::utility::sanitize_filename(path);
        if (path.find(".") == std::string::npos){
            res.set_static_file_info_unsafe("static/index.html");
        } else {
            res.set_static_file_info_unsafe("static/" + path);
        }
        res.end();
    });

    app.port(18080).ssl_file("localhost.pem", "localhost-key.pem").multithreaded().run();

    return 0;
}