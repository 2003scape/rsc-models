// there's some models that aren't assigned to any objects in config, so never
// get loaded in the client

const fs = require('fs');
const { Config } = require('@2003scape/rsc-config');
const { Models, Model } = require('./src/index');
const { hashFilename } = require('@2003scape/rsc-archiver');

const config = new Config();
config.loadArchive(fs.readFileSync('./config85.jag'));

const models = new Models(config);
models.loadArchive(fs.readFileSync('./models36.jag'));

const { archive } = models;

const secretHashes = Array.from(archive.entries.keys()).filter(
    (hash) => {
        for (const name of models.modelNames) {
            if (hashFilename(`${name}.ob3`) === hash) {
                return false;
            }
        }

        return true;
    }
);

for (const hash of secretHashes) {
    const model = Model.fromOb3(models, archive.getEntry(hash));

    const name = hash.toString();
    model.name = name;

    fs.writeFileSync(
        `./secret-obj/${name}.obj`,
        model.getObj()
    );

    fs.writeFileSync(
        `./secret-obj/${name}.mtl`,
        model.getMtl()
    );
}
