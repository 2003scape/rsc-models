const THREE = require('three');
const { Config } = require('@2003scape/rsc-config');
const { Models, Model } = require('./src/index');
const { hashFilename } = require('@2003scape/rsc-archiver');

require('buffer');

window.THREE = THREE;

require('three/examples/js/controls/OrbitControls');
require('three/examples/js/loaders/MTLLoader');
require('three/examples/js/loaders/OBJLoader');

const WIDTH = 640;
const HEIGHT = 480;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xff00ff);
scene.add(new THREE.AxesHelper(5));

const light = new THREE.AmbientLight(0xffffff, 1);
scene.add(light);

const camera = new THREE.PerspectiveCamera(50, WIDTH / HEIGHT);
camera.position.set(5, 2, 4);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(WIDTH, HEIGHT);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.target.set(0, 1, 0);

const mtlLoader = new THREE.MTLLoader();
const objLoader = new THREE.OBJLoader();

mtlLoader.setResourcePath('/textures17-png/');
mtlLoader.setMaterialOptions({ side: THREE.DoubleSide });

(async function () {
    const config = new Config();
    const configRes = await fetch('./config85.jag');
    config.loadArchive(Buffer.from(await configRes.arrayBuffer()));

    const models = new Models(config);
    const modelsRes = await fetch('./models36.jag');
    models.loadArchive(Buffer.from(await modelsRes.arrayBuffer()));

    const { archive } = models;

    const secretHashes = Array.from(archive.entries.keys()).filter((hash) => {
        for (const name of models.modelNames) {
            if (hashFilename(`${name}.ob3`) === hash) {
                return false;
            }
        }

        return true;
    });

    for (const hash of secretHashes) {
        const model = Model.fromOb3(models, archive.getEntry(hash));
        model.name = hash.toString();
        models.setModel(model.name, model);
    }

    let object = null;

    const modelNames = models.modelNames.sort();

    function setModel(name) {
        if (modelNames.indexOf(name) < 0) {
            return;
        }

        window.location.hash = name;

        if (object) {
            scene.remove(object);
        }

        const model = models.getModelByName(name);

        const materials = mtlLoader.parse(model.getMtl());
        objLoader.setMaterials(materials);

        object = objLoader.parse(model.getObj());

        scene.add(object);
    }

    const modelSelect = document.getElementById('rsc-models-name');

    for (const modelName of modelNames) {
        modelSelect.add(new Option(modelName, modelName));
    }

    modelSelect.addEventListener('change', () => {
        setModel(modelSelect.value);
    });

    const hashModelName = window.location.hash.slice(1);

    if (hashModelName) {
        modelSelect.value = hashModelName;
        setModel(hashModelName);
    } else {
        setModel(modelNames[0]);
    }

    const modelWrap = document.getElementById('rsc-models-model-wrap');

    modelWrap.appendChild(renderer.domElement);

    const lightRange = document.getElementById('rsc-models-light');

    lightRange.value = 1.0;

    lightRange.addEventListener('change', () => {
        light.intensity = Number(lightRange.value);
    });

    const colourInput = document.getElementById('rsc-models-background');

    colourInput.value = '#ff00ff';

    colourInput.addEventListener('change', () => {
        scene.background = new THREE.Color(
            Number.parseInt(colourInput.value.slice(1), 16)
        );
    });

    function animate() {
        controls.update();
        renderer.render(scene, camera);
        window.requestAnimationFrame(animate);
    }

    animate();
})();
