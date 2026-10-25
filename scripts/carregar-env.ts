// Carrega o .env.local nos scripts (o Next faz isso sozinho; o tsx não). Importar ANTES de lib/config.
import { existsSync } from "node:fs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
