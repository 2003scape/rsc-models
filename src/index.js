const OBJFile = require('obj-file-parser');
const { JagArchive } = require('@2003scape/rsc-archiver');

const MAGIC_TRANSPARENT = 32767; // max short

// tris and quads can use the same coordinates each time
const TEXTURE_UVS = {
    // TODO make sure this is right
    3: [
        { u: 1, v: 1 },
        { u: 0, v: 1 },
        { u: 0, v: 0 },
    ],

    4: [
        { u: 1, v: 1 },
        { u: 0, v: 1 },
        { u: 0, v: 0 },
        { u: 1, v: 0 }
    ]
};

function encodeVertex(vertex) {
    return (vertex / 100).toFixed(6);
}

function decodeVertex(vertex) {
    return Math.floor(vertex * 100);
}

function decodeFill(faceFill) {
    if (faceFill < 0) {
        faceFill = -1 - faceFill;

        const r = ((faceFill >> 10) & 0x1f) * 8;
        const g = ((faceFill >> 5) & 0x1f) * 8;
        const b = (faceFill & 0x1f) * 8;

        return { r, g, b };
    }

    if (faceFill === MAGIC_TRANSPARENT) {
        return null;
    }

    return { texture: faceFill };
}

function encodeFill(face) {
    if (!face) {
        return MAGIC_TRANSPARENT;
    }

    if (face.texture) {
        return face.texture;
    }

    return -Math.floor(
        ((face.r / 8) << 10) |
        ((face.g / 8) << 5) |
        ((face.b / 8))
    ) - 1;
}

function encodeRGB(channel) {
    return (channel / 248).toFixed(6);
}

function getMinPlane(vertices, plane) {
    return Math.min(
        ...vertices.map((vertex) => {
            return vertex[plane];
        })
    );
}

function getMaxPlane(vertices, plane) {
    return Math.max(
        ...vertices.map((vertex) => {
            return vertex[plane];
        })
    );
}

// find the most-obvious 2D shape out of a face by creating a 2D polygon
// mapping two of the three planes (either (x, y), (x, z), (y, z))
function unwrapUVs(vertices) {
    console.log(vertices);

    const min = { x: 0, y: 0, z: 0 };
    const max = { x: 0, y: 0, z: 0 };
    const length = { x: 0, y: 0, z: 0 };

    for (const plane of ['x', 'y', 'z']) {
        min[plane] = getMinPlane(vertices, plane);
        max[plane] = getMaxPlane(vertices, plane);
        length[plane] = max[plane] - min[plane];
    }

    let uPlane = null;
    let vPlane = null;

    if (length.x < length.y && length.x < length.z) {
        uPlane = 'y';
        vPlane = 'z';
    } else if (length.y < length.x && length.y < length.z) {
        uPlane = 'z';
        vPlane = 'x';
    } else if (length.z < length.x && length.z < length.y) {
        uPlane = 'x';
        vPlane = 'y';
    } else {
        throw new Error("unable to unwrap UVs (can't figure out orientation)");
    }

    const uvs = [];

    for (const vertex of vertices) {
        const u = Math.abs(vertex[uPlane] - min[uPlane]) / length[uPlane];
        const v = Math.abs(vertex[vPlane] - min[vPlane]) / length[vPlane];

        uvs.push({ u, v });
    }

    return uvs;
}

class Model {
    constructor({ textureNames }) {
        this.textureNames = textureNames;

        this.name = '';

        // [ { x, y, z } ]
        this.vertices = [];

        // [ { fillFront: { r, g, b }, fillBack, intensity: 0 || 1,
        //   vertices: [ index ] } ]
        this.faces = [];

        // { { r, g, b, texture}: ID }
        this.fillIDs = new Map();
    }

    updateFillIDs() {
        const uniqueFills = new Set();

        for (const { fillFront, fillBack } of this.faces) {
            if (fillFront) {
                uniqueFills.add(JSON.stringify(fillFront));
            }

            if (fillBack) {
                uniqueFills.add(JSON.stringify(fillBack));
            }
        }

        for (const [i, fill] of Array.from(uniqueFills).entries()) {
            this.fillIDs.set(fill, i);
        }
    }

    static fromOb3(models, data) {
        const model = new Model(models);

        let offset = 0;

        const numVertices = data.readUInt16BE(offset);
        offset += 2;

        const numFaces = data.readUInt16BE(offset);
        offset += 2;

        for (let i = 0; i < numVertices; i += 1) {
            model.vertices[i] = { x: data.readInt16BE(offset) };
            offset += 2;
        }

        for (let i = 0; i < numVertices; i += 1) {
            model.vertices[i].y = data.readInt16BE(offset);
            offset += 2;
        }

        for (let i = 0; i < numVertices; i += 1) {
            model.vertices[i].z = data.readInt16BE(offset);
            offset += 2;
        }

        const faceNumVertices = [];
        faceNumVertices.length = numFaces;

        for (let i = 0; i < numFaces; i += 1) {
            faceNumVertices[i] = data[offset++];
        }

        for (let i = 0; i < numFaces; i += 1) {
            model.faces.push({
                fillFront: decodeFill(data.readInt16BE(offset))
            });

            offset += 2;
        }

        for (let i = 0; i < numFaces; i += 1) {
            model.faces[i].fillBack = decodeFill(data.readInt16BE(offset));
            offset += 2;
        }

        for (let i = 0; i < numFaces; i += 1) {
            model.faces[i].intensity = data[offset++] & 0xff;
        }

        for (let i = 0; i < numFaces; i += 1) {
            const length = faceNumVertices[i];
            const vertices = [];

            let lastVertexIndex = -1;

            for (let j = 0; j < length; j += 1) {
                let vertexIndex = 0;

                if (numVertices < 256) {
                    vertexIndex = data[offset++] & 0xff;
                } else {
                    vertexIndex = data.readUInt16BE(offset);
                    offset += 2;
                }

                // the chair had the same vertex index consecutively which
                // doesn't render in blender
                if (lastVertexIndex !== vertexIndex) {
                    vertices.push(vertexIndex);
                    lastVertexIndex = vertexIndex;
                }
            }

            model.faces[i].vertices = vertices;
        }

        model.updateFillIDs();

        return model;
    }

    getOb3() {
        const numVertices = this.vertices.length;
        const numFaces = this.faces.length;

        const data = Buffer.alloc(
            4 + // numVertices, numFaces
                6 * numVertices + // vertices x, y, z
                6 * numFaces // faceNumVertices + faceFrillFront/Back + faceIntensity
        );

        let offset = 0;

        data.writeUInt16BE(numVertices, offset);
        offset += 2;

        data.writeUInt16BE(numFaces, offset);
        offset += 2;

        for (const { x } of this.vertices) {
            data.writeInt16BE(x, offset);
            offset += 2;
        }

        for (const { y } of this.vertices) {
            data.writeInt16BE(y, offset);
            offset += 2;
        }

        for (const { z } of this.vertices) {
            data.writeInt16BE(z, offset);
            offset += 2;
        }

        for (const { vertices } of this.faces) {
            data[offset++] = vertices.length;
        }

        for (const { fillFront } of this.faces) {
            data.writeInt16BE(encodeFill(fillFront), offset);
            offset += 2;
        }

        for (const { fillBack } of this.faces) {
            data.writeInt16BE(encodeFill(fillBack), offset);
            offset += 2;
        }

        for (const { intensity } of this.faces) {
            data[offset++] = intensity;
        }

        const buffers = [data];

        for (const { vertices } of this.faces) {
            for (const vertex of vertices) {
                const buffer = Buffer.alloc(numVertices < 256 ? 1 : 2);

                if (numVertices < 256) {
                    buffer[0] = vertex;
                } else {
                    buffer.writeUInt16BE(vertex);
                }

                buffers.push(buffer);
            }
        }

        return Buffer.concat(buffers);
    }

    getMtl() {
        const lines = [
            'newmtl default',
            'Kd 1.000000 0.000000 1.000000',
            'd 0.000000',
            ''
        ];

        for (const [fill, i] of this.fillIDs.entries()) {
            lines.push(`newmtl material_${i}`);

            const parsedFill = JSON.parse(fill);

            if (typeof parsedFill.texture !== 'undefined') {
                const textureName = this.textureNames[parsedFill.texture];

                lines.push(`map_Kd ${textureName}.png`);
            } else {
                const { r, g, b } = parsedFill;

                lines.push(
                    `Kd ${encodeRGB(r)} ${encodeRGB(g)} ${encodeRGB(b)}`
                );
            }

            if (i < this.fillIDs.size - 1) {
                lines.push('');
            }
        }

        return lines.join('\n');
    }

    getObjModel(front = false) {
        const objLines = ['', `o ${this.name}_${front ? 'front' : 'back'}`];

        for (const { x, y, z } of this.vertices) {
            objLines.push(
                `v ${encodeVertex(x)} ${encodeVertex(-y)} ${encodeVertex(z)}`
            );
        }

        objLines.push('');

        const uvs = [];
        const faceLines = [];

        let lastMaterial = -1;

        if (!front) {
            this.uvOffset = 1;
        }

        for (const { vertices, fillFront, fillBack } of this.faces) {
            const fill = front ? fillFront : fillBack;

            if (fill) {
                const materialID = this.fillIDs.get(JSON.stringify(fill));

                if (materialID !== lastMaterial) {
                    lastMaterial = materialID;
                    faceLines.push(`usemtl material_${materialID}`);
                }

                if (fill.texture) {
                    if (vertices.length <= 4) {
                        uvs.push(...TEXTURE_UVS[vertices.length]);
                    } else {
                        uvs.push(...unwrapUVs(vertices.map((index) => {
                            return this.vertices[index];
                        })));
                    }
                }
            } else {
                if (lastMaterial !== 'default') {
                    faceLines.push('usemtl default');
                    lastMaterial = 'default';
                }
            }

            let line = 'f ';

            for (const [i, vertexIndex] of vertices.entries()) {
                // TODO can we re-use the vertices from the first model?
                let index = vertexIndex + (front ? this.vertices.length : 0);
                line += `${index + 1}`;

                if (fill && fill.texture) {
                    line += `/${this.uvOffset + i}`;
                }

                line += ' ';
            }

            if (fill && fill.texture) {
                this.uvOffset += vertices.length;
            }

            faceLines.push(line.trim());
        }

        objLines.push(...uvs.map(({ u, v}) => {
            return `vt ${u.toFixed(6)} ${v.toFixed(6)}`;
        }));

        objLines.push('');

        objLines.push(...faceLines);

        return objLines.join('\n') + '\n';
    }

    getObj() {
        const lines = [
            '# generated by https://github.com/2003scape/rsc-models',
            `mtllib ${this.name}.mtl`,
            ''
        ];

        const back = this.getObjModel();
        const front = this.getObjModel(true);

        return (lines.join('\n') + back + front).trim();
    }

    toJSON() {
        return {
            name: this.name,
            vertices: this.vertices,
            faces: this.faces
        };
    }
}

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

    fromWavefront(objFile, mtlFile) {
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
