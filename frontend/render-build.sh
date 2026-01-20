#!/bin/bash
# Fix ajv issue before build
npm install ajv@6.12.6 --save --legacy-peer-deps
npm run build
