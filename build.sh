#! /bin/sh

# assumes
# $ dotnet tool install --global SBSharp.Launcher

rm -Rf _site
sbsharp build
