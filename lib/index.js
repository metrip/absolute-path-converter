#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Path = require("path");
const recursive = require("recursive-readdir");
const Fs = require("fs");
const xregexp = require("xregexp");
const Util = require("util");
const HAS_BACKSLASH_SEPARATOR = Path.sep === '\\';
try {
    require('source-map-support').install();
}
catch (error) {
    console.warn('Source map support unavailable ("source-map-support" required). Proceeding without.');
}
const convertPaths = (conversionTargetRoot) => {
    if (!conversionTargetRoot)
        throw Error('Could not determine conversion target root');
    const convert = (ignorePattern, convertRegexp, replacementFormat) => {
        recursive(conversionTargetRoot, [ignorePattern], (error, files) => {
            files.forEach(file => {
                const fileContent = Fs.readFileSync(file, 'utf-8');
                const regex = xregexp(convertRegexp);
                const modifiedFileContent = xregexp.replace(fileContent, regex, (wholeRequire, ...rest) => {
                    const matches = rest.slice(0, rest.length - 2);
                    const modulePath = matches[matches.length - 1];
                    if (modulePath.match(/^\.{0,2}\//)) {
                        return wholeRequire;
                    }
                    try {
                        require(modulePath);
                        return wholeRequire;
                    }
                    catch (error) {
                        let newRequirePath = Path.relative(`${file}/..`, `${conversionTargetRoot}/${modulePath}`);
                        if (newRequirePath[0] !== '.')
                            newRequirePath = './' + newRequirePath;
                        if (HAS_BACKSLASH_SEPARATOR) {
                            newRequirePath = newRequirePath.replace(/\\/g, '/');
                        }
                        matches[matches.length - 1] = newRequirePath;
                        return Util.format(replacementFormat, ...matches);
                    }
                }, 'all');
                Fs.writeFileSync(file, modifiedFileContent);
            });
        });
    };
    convert('!*.js', /require\(["']([^"']*)["']\)/, 'require("%s")');
    convert('!*.d.ts', /import (.*?) from ["']([^"']*)["']/, 'import %s from "%s"');
};
const parentProjectRoot = Path.resolve(__dirname, '../../../');
let conversionTargetRoot;
const conversionTargetArgument = process.argv[2];
if (conversionTargetArgument) {
    conversionTargetRoot = Path.resolve(parentProjectRoot, conversionTargetArgument);
}
else {
    try {
        const tsconfigPath = Path.resolve(parentProjectRoot, 'tsconfig.json');
        const tsconfig = require(tsconfigPath);
        if (tsconfig.compilerOptions && tsconfig.compilerOptions.outDir) {
            conversionTargetRoot = Path.resolve(parentProjectRoot, tsconfig.compilerOptions.outDir);
        }
        convertPaths(conversionTargetRoot);
    }
    catch (error) {
        console.error(error);
    }
}
//# sourceMappingURL=index.js.map