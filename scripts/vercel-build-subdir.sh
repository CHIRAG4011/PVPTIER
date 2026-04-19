#!/bin/sh
set -e

cd ../..

pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/pvp-leaderboard run build

mkdir -p .vercel/output/static
cp -r artifacts/pvp-leaderboard/dist/. .vercel/output/static/

mkdir -p .vercel/output/functions/api.func
cp api/index.js .vercel/output/functions/api.func/index.js
mkdir -p .vercel/output/functions/api.func/artifacts/api-server
cp -r artifacts/api-server/dist .vercel/output/functions/api.func/artifacts/api-server/dist

printf '{"runtime":"nodejs20.x","handler":"index.js","maxDuration":30}' > .vercel/output/functions/api.func/.vc-config.json
printf '{"version":3,"routes":[{"src":"/api/(.*)","dest":"/api"},{"handle":"filesystem"},{"src":"/(.*)","dest":"/index.html"}]}' > .vercel/output/config.json
