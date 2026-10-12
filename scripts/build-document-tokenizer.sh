#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
task_root="$PWD"
task_source="$task_root/.parser-cache/udpipe-source"
if [ ! -d "$task_source" ]; then
  git clone https://github.com/ufal/udpipe.git "$task_source"
fi
git -C "$task_source" checkout da13c46cccc55fc0772ff221abbea3f798237115
mkdir -p "$task_root/.parser-cache/tokenizer-build"
make -C "$task_source/src_lib_only" udpipe.cpp
docker run --rm -v "$task_root:/task" -w /task emscripten/emsdk@sha256:d0be652409a4d3362b8a36c3279dd1123ff1c9327e603d86d9361aa84f1d2e4c \
 em++ .parser-cache/udpipe-source/src_lib_only/udpipe.cpp scripts/document-tokenizer.cpp \
 -I .parser-cache/udpipe-source/src_lib_only -Oz -std=c++17 --bind \
 -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker,node -sDYNAMIC_EXECUTION=0 \
 -sALLOW_MEMORY_GROWTH=1 -sFORCE_FILESYSTEM=1 -sINVOKE_RUN=0 \
 '-sEXPORTED_RUNTIME_METHODS=["FS"]' \
 -o .parser-cache/tokenizer-build/document-tokenizer.mjs
