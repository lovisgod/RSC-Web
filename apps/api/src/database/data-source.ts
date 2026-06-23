import "reflect-metadata";

import { config as loadEnvironment } from "dotenv";
import { DataSource } from "typeorm";

import { createDataSourceOptions } from "./data-source-options";

loadEnvironment();

export default new DataSource(createDataSourceOptions());
