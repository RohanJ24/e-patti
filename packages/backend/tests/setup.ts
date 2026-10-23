import fs from "fs";
import os from "os";
import path from "path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "epatti-test-"));
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-at-least-32-characters-long";
process.env.DATA_DIR = dir;
process.env.GENERATED_DIR = path.join(dir, "generated");
process.env.PORT = "0";
