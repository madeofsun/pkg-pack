#!/usr/bin/env node

// @ts-ignore
import pkg from "../../package.json";

import { defineCommand, runMain } from "citty";
import build from "./build.js";
import check from "./check.js";

const { name, version, description } = pkg;

const main = defineCommand({
  meta: {
    name,
    version,
    description,
  },
  subCommands: {
    build,
    check,
  },
});

runMain(main);
