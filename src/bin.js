#!/usr/bin/env node

const fs = require('fs').promises;
const mkdirp = require('mkdirp');
const path = require('path');
const pkg = require('../package');
const yargs = require('yargs');
const { Config } = require('@2003scape/rsc-config');
const { Models } = require('./');

const OBJ_REGEXP = /\.obj$/i;

yargs
    .scriptName('rsc-models')
    .version(pkg.version)
    .command(
        'dump-obj <config> <archive>',
        'dump model OBJs from models jag archive',
        (yargs) => {
            yargs.positional('config', {
                description: 'config jag archive',
                type: 'string'
            });

            yargs.positional('archive', {
                description: 'models jag archive',
                type: 'string'
            });

            yargs.option('output', {
                alias: 'o',
                description: 'directory to dump OBJ files',
                type: 'string'
            });
        },
        async (argv) => {
            try {
                const config = new Config();
                config.loadArchive(await fs.readFile(argv.config));

                const models = new Models(config);
                models.loadArchive(await fs.readFile(argv.archive));

                let output = argv.output;

                if (!output) {
                    const ext = path.extname(argv.archive);
                    output = `${path.basename(argv.archive, ext)}-obj`;
                }

                await mkdirp(output);

                for (const model of models.getModels()) {
                    await fs.writeFile(
                        path.join(output, `${model.name}.obj`),
                        model.getObj()
                    );

                    await fs.writeFile(
                        path.join(output, `${model.name}.mtl`),
                        model.getMtl()
                    );
                }
            } catch (e) {
                process.exitCode = 1;
                console.error(e);
            }
        }
    )
    .command(
        'pack-obj <config> <archive> <files..>',
        'pack model OBJ(s) into models jag archive',
        (yargs) => {
            yargs.positional('config', {
                description: 'config jag archive',
                type: 'string'
            });

            yargs.positional('archive', {
                description: 'models jag archive',
                type: 'string'
            });

            yargs.positional('files', {
                description: 'OBJ files to add to the models archive'
            });
        },
        async (argv) => {
            try {
                const config = new Config();
                config.loadArchive(await fs.readFile(argv.config));

                const models = new Models(config);
                models.loadArchive(await fs.readFile(argv.archive));

                for (const objFilename of argv.files) {
                    const extName = path.extname(objFilename);

                    if (!OBJ_REGEXP.test(extName)) {
                        continue;
                    }

                    const modelName = path.basename(objFilename, extName);
                    const mtlFilename = objFilename.replace(OBJ_REGEXP, '.mtl');

                    const objFile = await fs.readFile(objFilename, 'utf8');
                    const mtlFile = await fs.readFile(mtlFilename, 'utf8');

                    const model = models.fromWavefront(objFile, mtlFile);

                    models.setModel(modelName, model);
                }

                await fs.writeFile(argv.archive, models.toArchive());
            } catch (e) {
                console.error(e);
                process.exit(1);
            }
        }
    )
    .demandCommand().argv;
