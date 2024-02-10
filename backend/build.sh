#!/bin/bash

echo "=======[ build | Back end | Debug ]======="
cd ../backend

mkdir -p build

cd build

cmake ..

make

cd ..

./dashboard_backend
