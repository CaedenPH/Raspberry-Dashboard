#!/bin/bash

echo "=======[ build | Back end | Debug ]======="
cd ../backend

mkdir -p build

cd build

cmake -G "Ninja" ..

ninja

cd ..

