# welcome to a crow backend

the wonders of cpp and crow behold you, dont know where to begin?

### creating a new endpoint
Want to add an endpoint for your new latest useless application?
it is made easy using crow

```cpp
// main.cpp

int main() {
    ...

    CROW_ROUTE(app, "/somePath")(
        [](const crow::request &req, crow::reponse &res){
            // do something

            ...
        }
    );
}
```
> [!NOTE]
> for more information vist [crow](https://www.crowcpp.org)

### do some database operations
For sql we are using soci a wonderful tool the folks at cern cry over!

```cpp
// main.cpp

db << "some query", soci::into(some_var), soci::use(some_other_var);

//  here into will put what ever you got from the select query
// and use will supply the ? in VALUES(?,?,?)

```




### dir structure
<pre>

.
├── build.sh                Builds cpp project
├── CMakeLists.txt          Defines cpp project
├── includes                Cpp header files
│   ├── crow_all.h              crow::backendlib
│   └── dashboard.h             dashboard::app
├── README.md               this file
├── src                     Contains cpp source files
│   └── main.cpp                cpp::main()
├── static                  contains files built by angular
└── userdb                  user database

</pre>

### building

```bash
# build the project
./build.sh

# run the project
./dashboard_backend

```
> [!IMPORTANT]  
> Build.sh only compiles the cpp files VISUALS ARE NOT BUILT!!
