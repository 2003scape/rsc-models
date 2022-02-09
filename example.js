const fs = require('fs');
const { Config } = require('@2003scape/rsc-config');
const { Models } = require('./src/index');

const config = new Config();
config.loadArchive(fs.readFileSync('./config85.jag'));

const models = new Models(config);
models.loadArchive(fs.readFileSync('./models36.jag'));

const model = models.getModelByName('obelisk');
console.log(model.getMtl());

/*
const model = models.fromWavefront(
    fs.readFileSync('./yoshi.obj', 'utf8'),
    fs.readFileSync('./yoshi.mtl', 'utf8')
);

models.setModel('tree', model);

fs.writeFileSync('./models36.2.jag', models.toArchive());*/
