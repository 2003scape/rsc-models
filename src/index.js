const Model = require('./model');
const { JagArchive } = require('@2003scape/rsc-archiver');

class Models {
    constructor({ objects, textures }) {
        // names of models
        this.modelNames = new Set();

        for (const { model } of objects) {
            this.modelNames.add(model.name);
        }

        this.modelNames = Array.from(this.modelNames);

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

module.exports = { Models, Model };
