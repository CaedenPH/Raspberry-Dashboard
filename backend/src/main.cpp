// stdlib
#include <iostream>
#include <cstring>
#include <iomanip>
#include <string>
#include <fstream>
#include <vector>
#include <cmath>
#include <ctime>
#include <sys/sysinfo.h>
#include <cstdio>

// crypto
// #include <jwt-cpp/jwt.h>
#include <openssl/sha.h>

// db
#include <soci/soci.h>
#include <soci/sqlite3/soci-sqlite3.h>

// web
#define CROW_DISABLE_STATIC_DIR // disable static serving
#include "crow_all.h"

// these macros might cause issues but they make this more readable
#define to_uchar(x) reinterpret_cast<const unsigned char *>(x)
#define stringify(x) std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(x)


crow::App<crow::CookieParser, crow::CORSHandler> app;

soci::session db(soci::sqlite3, "userdb");


std::string exec(std::string command) {
    char buffer[128];
    std::string result = "";

    FILE* pipe = popen(command.c_str(), "r");
    if (!pipe) {
        return "no pipe";
    }

    while(!feof(pipe)){
        if(fgets(buffer, 128, pipe) != nullptr){
            result += buffer;
        }
    }

    pclose(pipe);
    return result;
}


bool verify_pass(const std::string &username, const std::string &password)
{
    unsigned char hashed_username[SHA256_DIGEST_LENGTH];
    unsigned char hashed_password[SHA256_DIGEST_LENGTH];

    SHA256(to_uchar(username.c_str()), username.size(), hashed_username);
    SHA256(to_uchar(password.c_str()), password.size(), hashed_password);

    std::stringstream username_stream, password_stream;

    for (int i{0}; i < SHA256_DIGEST_LENGTH; i++)
    {
        username_stream << stringify(hashed_username[i]);
        password_stream << stringify(hashed_password[i]);
    }

    std::string pass;
    db << "select password from accounts where username = '" << username_stream.str() << "'", soci::into(pass);
 
    return (!pass.empty() && pass == password_stream.str());
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
        std::string auth, credentials, username, password;

        auth = req.get_header_value("Authorization");
        credentials = auth.substr(6);
        credentials = crow::utility::base64decode(credentials, credentials.size());

        size_t colon = credentials.find(':');

        username = credentials.substr(0, colon);
        password = credentials.substr(colon+1);

        res.code = verify_pass(username, password) ? 200 : 401;
        res.end();
        }
    );


    CROW_ROUTE(app, "/api/data/serverspeed").methods(crow::HTTPMethod::GET)(
        []() {
            crow::json::rvalue json = crow::json::load(exec("speedtest-cli --bytes --json"));
            double download = json["download"].d();
            double upload = json["upload"].d();
            
            crow::json::wvalue ret;
            ret["download"] = download;
            ret["upload"] = upload;
            ret["time"] = time(nullptr);


            return ret;
        }
    );

    CROW_ROUTE(app, "/api/data/server").methods(crow::HTTPMethod::GET)
    ([](const crow::request &req, crow::response &res){
        struct sysinfo info;
        float load_offset = 1.0f / (1 << SI_LOAD_SHIFT);
       
        memset(&info, 0, sizeof(info));

        // sys info returns 0 if it succeded
        if(sysinfo(&info) != 0) {
            res.code = 500;
            res.end();
        }

        crow::json::wvalue json;
        json["uptime"] = info.uptime;
        json["totalram"] = info.totalram;
        json["freeram"] = info.freeram;
        json["totalswap"] = info.totalswap;
        json["freeswap"] = info.freeswap;
        json["loadavg"] = ceil(info.loads[0] * load_offset);
        json["time"] = time(nullptr);
        res.write(json.dump());
        res.set_header("Content-Type", "application/json");
        res.code = 200;
        res.end();
        }
    );

    // override static file serving
    CROW_ROUTE(app, "/<path>")
    ([](const crow::request &req, crow::response &res, std::string path) {
        
        crow::utility::sanitize_filename(path);

        if (path.find(".") == std::string::npos) {
            res.set_static_file_info_unsafe("static/index.html");
        } else {
            res.set_static_file_info_unsafe("static/" + path);
        }
        
        res.end();
    });

    app.port(18080).ssl_file("localhost.pem", "localhost-key.pem").multithreaded().run();

    return 0;
}