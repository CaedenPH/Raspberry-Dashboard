cmake_minimum_required(VERSION 3.28)
project(dashboard_backend)

include(FetchContent)
include(FindOpenSSL)
# un comment once jwt is implemented
#fetchcontent_declare(jwt-cpp
#        GIT_REPOSITORY https://github.com/Thalhammer/jwt-cpp.git
#        GIT_TAG 08bcf77a687fb06e34138e9e9fa12a4ecbe12332 # v0.7.0 release
#        )
#set(JWT_BUILD_EXAMPLES OFF CACHE BOOL "disable building examples" FORCE)
#fetchcontent_makeavailable(jwt-cpp)

find_package( Boost 1.52 COMPONENTS system thread REQUIRED )


set(CMAKE_CXX_STANDARD 14)

include_directories(./includes)

add_executable(dashboard_backend
        ./includes/crow_all.h
        main.cpp)
add_compile_options(-DCROW_ENABLE_SSL)
# target_link_libraries(dashboard_backend PRIVATE jwt-cpp::jwt-cpp)
target_link_libraries(dashboard_backend PRIVATE soci_core soci_sqlite3)
target_link_libraries(dashboard_backend PRIVATE OpenSSL::SSL)

