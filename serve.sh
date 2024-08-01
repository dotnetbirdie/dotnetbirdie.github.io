#!/bin/bash

# assumes:
# $ dotnet tool install --global SBSharp.Launcher

rm -Rf _site
xdg-open http://localhost:4200
USE_LIVEJS=true sbsharp serve --sbsharp:Output:NotBeforeToday=false
