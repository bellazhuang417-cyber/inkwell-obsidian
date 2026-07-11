import { readFileSync, writeFileSync } from "fs";

const targetVersion = process.env.npm_package_version;

// read minAppVersion from manifest.json and bump all targets to target version
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[minAppVersion] = targetVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");
