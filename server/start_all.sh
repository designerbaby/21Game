#!/bin/bash
killall -r node
forever start proxy.js
forever start game21.js
forever start accounts.js
forever start httpserver.js
