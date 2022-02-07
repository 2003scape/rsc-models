const fs = require('fs');
const { Config } = require('@2003scape/rsc-config');
const { Models, Model } = require('./src/index');

const MTLFile = require('mtl-file-parser');
const OBJFile = require('obj-file-parser');

const config = new Config();
config.loadArchive(fs.readFileSync('./config85.jag'));

const models = new Models(config);
models.loadArchive(fs.readFileSync('./models36.jag'));

/*
let max = 0;
let maxmodel;
let total = 0;
let length = 0;

for (const model of models.models.values()) {
    for (const { x } of model.vertices) {
        total += Math.abs(x);
        length += 1;
        if (x > max) {
            max = x;
            maxmodel = model;
        }
    }
}

console.log(total, length, total/length);*/

/*
const model = Model.fromWavefront(
    models,
    fs.readFileSync('./table.obj', 'utf8'),
    fs.readFileSync('./table.mtl', 'utf8')
);*/

//console.log(max, maxmodel);
//console.log(encodeWavefront(maxmodel).obj);

const model = models.getModelByName('table');

const materials = new Map();
let material = null;
let materialName = null;

const mtlLines = fs
    .readFileSync('./n64.mtl', 'utf8')
    .split('\n');

for (const line of mtlLines) {
    if (/^newmtl /.test(line)) {
        materialName = line.split(' ');
        materialName.shift();
        materialName = materialName.join(' ');

        material = {};
        materials.set(materialName, material);
    }

    if (/^Kd /.test(line)) {
        const [,r,g,b] = line.split(' ');
        material.r = Math.floor(Number(r) * 248);
        material.g = Math.floor(Number(g) * 248);
        material.b = Math.floor(Number(b) * 248);
    }
}

//console.log(materials);

const objFile = fs.readFileSync('./n64.obj', 'utf8');
const obj = new OBJFile(objFile).parse().models[0];

function decodeVertex(vertex) {
    return Math.floor(vertex * 100);
}

model.vertices = obj.vertices.map(({ x, y, z }) => {
    return { x: decodeVertex(x), y: decodeVertex(-y), z: decodeVertex(z) };
});

model.faces = obj.faces.map((face) => {
    const vertices = face.vertices.map(({ vertexIndex }) => {
        return vertexIndex - 1;
    });

    return {
        fillFront: materials.get(face.material),
        fillBack: materials.get(face.material),
        //fillBack: null,
        intensity: 1,
        vertices
    };
});

for (const { fillFront, fillBack } of model.faces) {
    if (fillFront) {
        console.log(fillFront);
    }

    if (fillBack) {
        console.log(fillBack);
    }
}

model.updateFillIDs();

//console.log(model);
//const model = models.getModelByName('ChestOpen');
//console.log(model.getMtl());

/*
for (const model of models.models.values()) {
    //console.log(model.name);
    //console.log(model.getObj());
    for (const { fillFront, fillBack } of model.faces) {
        if (fillFront) {
            console.log(fillFront);
        }

        if (fillBack) {
            console.log(fillBack);
        }
    }
}*/

fs.writeFileSync('./models36.2.jag', models.toArchive());
