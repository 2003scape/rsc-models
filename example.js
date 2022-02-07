const fs = require('fs');
const { Config } = require('@2003scape/rsc-config');
const { Textures } = require('@2003scape/rsc-sprites');
const { Models, Model } = require('./src/index');

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

const model = models.getModelByName('doubledoorsopen');
//console.log(model);
//const model = models.getModelByName('ChestOpen');
console.log(model.getMtl());

/*
for (const model of models.models.values()) {
    console.log(model.name);
    console.log(model.getObj());
}*/

/*
model.faces = model.faces.map((face) => {
    face.fillFront = JSON.parse(JSON.stringify(face.fillBack));
    face.fillFront = null;
    //face.fillBack = { a: 0 };
    return face;
});*/

//fs.writeFileSync('./models36.2.jag', models.toArchive());
