const fs = require('fs');
const { Config } = require('@2003scape/rsc-config');
const { Models } = require('./src/index');

const config = new Config();
config.loadArchive(fs.readFileSync('./config85.jag'));

const models = new Models(config);
models.loadArchive(fs.readFileSync('./models36.jag'));

// dumping wavefront
const tree = models.getModelByName('tree');

fs.writeFileSync('./tree.obj', tree.getObj());
fs.writeFileSync('./tree.mtl', tree.getMtl());

// loading external wavefront
const yoshi = models.fromWavefront(
    fs.readFileSync('./yoshi.obj', 'utf8'),
    fs.readFileSync('./yoshi.mtl', 'utf8')
);

models.setModel('tree', yoshi);

fs.writeFileSync('./models37.jag', models.toArchive());
