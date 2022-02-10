#!/usr/bin/env node

const fs = require('fs').promises;
const mkdirp = require('mkdirp');
const path = require('path');
const pkg = require('../package');
const yargs = require('yargs');
const { Config } = require('@2003scape/rsc-config');
const { Models } = require('./');

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
    .demandCommand().argv;
