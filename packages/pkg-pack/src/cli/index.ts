#!/usr/bin/env node

import pkg from "../../package.json";

import { program } from "@commander-js/extra-typings";

import { defineBuildCommand } from "./build.js";
import { defineCheckCommand } from "./check.js";

const { name, version, description } = pkg;

program.name(name);
program.version(version);
program.description(description);

defineBuildCommand(program);
defineCheckCommand(program.command("check"));

program.parse();
