#!/usr/bin/env bash
# Rebuilds vendor/anthropic-sdk-<version>.js — a single browser ESM bundle of the
# official Anthropic TypeScript SDK. The app itself has no build step; this is
# only needed when upgrading the SDK. Update the import path in js/claude.js and
# the precache list in sw.js afterwards.
set -euo pipefail
VERSION="${1:-1.11.0}"
TMP="$(mktemp -d)"
cd "$TMP"
npm init -y >/dev/null
npm install "@anthropic-ai/sdk@${VERSION}" esbuild >/dev/null
echo 'export { default } from "@anthropic-ai/sdk";' > entry.js
npx esbuild entry.js --bundle --format=esm --minify --platform=browser --outfile=out.js
cd - >/dev/null
cp "$TMP/out.js" "vendor/anthropic-sdk-${VERSION}.js"
echo "Wrote vendor/anthropic-sdk-${VERSION}.js"
