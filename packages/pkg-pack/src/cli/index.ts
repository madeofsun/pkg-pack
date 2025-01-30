#!/usr/bin/env node

// @ts-ignore
import pkg from "../../package.json";

import { defineCommand, runMain } from "citty";
import buildCmd from "./build.js";

const { name, version, description } = pkg;

const main = defineCommand({
  meta: {
    name,
    version,
    description,
  },
  subCommands: {
    build: buildCmd,
  },
});

runMain(main);
