const Model = require('./model');
const { JagArchive } = require('@2003scape/rsc-archiver');

const ANIMATED_MODELS = [
    'torcha2',
    'torcha3',
    'torcha4',
    'skulltorcha2',
    'skulltorcha3',
    'skulltorcha4',
    'firea2',
    'firea3',
    'fireplacea2',
    'fireplacea3',
    'firespell2',
    'firespell3',
    'lightning2',
    'lightning3',
    'clawspell2',
    'clawspell3',
    'clawspell4',
    'clawspell5',
    'spellcharge2',
    'spellcharge3'
];

class Models {
    constructor({ objects, textures }, extraNames = ANIMATED_MODELS) {
        // names of models
        this.modelNames = new Set();

        for (const { model } of objects) {
            this.modelNames.add(model.name);
        }

        this.modelNames = [...extraNames, ...Array.from(this.modelNames)];

        // { name: Model }
        this.models = new Map();

        this.textureNames = textures.map(({ name, subName }) => {
            return name + (subName ? `-${subName}` : '');
        });
    }

    loadArchive(buffer) {
        this.archive = new JagArchive();
        this.archive.readArchive(buffer);

        for (const name of this.modelNames) {
            const fileName = `${name}.ob3`;

            if (this.archive.hasEntry(fileName)) {
                const ob3 = this.archive.getEntry(fileName);

                const model = Model.fromOb3(this, ob3);
                model.name = name;

                this.models.set(name, model);
            }
        }
    }

    getModelByName(name) {
        return this.models.get(name);
    }

    getModelById(id) {
        return this.getModelByName(this.modelNames[id]);
    }

    getModels() {
        return Array.from(this.models.values());
    }

    setModel(name, model) {
        model.name = name;
        this.models.set(name, model);
        this.modelNames = Array.from(this.models.keys());
    }

    removeModel(name) {
        this.models.delete(name);
        this.modelNames = Array.from(this.models.keys());
    }

    fromWavefront(objFile, mtlFile) {
        const model = Model.fromWavefront(this, objFile, mtlFile);
        return model;
    }

    toArchive() {
        const archive = new JagArchive();

        for (const model of this.models.values()) {
            archive.putEntry(`${model.name}.ob3`, model.getOb3());
        }

        return archive.toArchive(false);
    }
}

module.exports = { Models, Model, ANIMATED_MODELS };
