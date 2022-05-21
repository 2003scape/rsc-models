const OBJFile = require('obj-file-parser');
const unwrapUVs = require('./unwrap-uvs');

const GENERATED_BY = '# generated by https://github.com/2003scape/rsc-models';
const MAGIC_TRANSPARENT = 32767; // max short

// tris and quads can use the same coordinates each time
const TEXTURE_UVS = {
    3: [
        { u: 0, v: 1 },
        { u: 1, v: 0.5 },
        { u: 0, v: 0 }
    ],
    4: [
        { u: 0, v: 1 },
        { u: 1, v: 1 },
        { u: 1, v: 0 },
        { u: 0, v: 0 }
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

        return { r, g, b, i: 1 };
    }

    if (faceFill === MAGIC_TRANSPARENT) {
        return null;
    }

    return { texture: faceFill, i: 1 };
}

function encodeFill(face) {
    if (!face) {
        return MAGIC_TRANSPARENT;
    }

    if (face.texture) {
        return face.texture;
    }

    return (
        -Math.floor(((face.r / 8) << 10) | ((face.g / 8) << 5) | (face.b / 8)) -
        1
    );
}

function encodeRGB(channel) {
    return (channel / 248).toFixed(6);
}

class Model {
    constructor({ textureNames }, { name, vertices, faces } = {}) {
        this.textureNames = textureNames;

        this.name = name || '';

        // [ { x, y, z } ]
        this.vertices = vertices || [];

        // [ { fillFront: { r, g, b }, fillBack, intensity: 0 || 1,
        //   vertices: [ index ] } ]
        this.faces = faces || [];

        // { { r, g, b, texture}: ID }
        this.fillIDs = new Map();

        // { ID: { r, g, b, texture } }
        this.materials = new Map();
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
            const intensity = data[offset++] & 0xff;

            if (intensity === 0) {
                const { fillFront, fillBack } = model.faces[i];

                if (fillFront) {
                    fillFront.i = 0;
                }

                if (fillBack) {
                    fillBack.i = 0;
                }
            }
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

        model.faces = model.faces.filter(({ vertices }) => {
            return vertices.length >= 3;
        });

        model.updateFillIDs();

        return model;
    }

    static fromWavefront(models, objFile, mtlFile) {
        const model = new Model(models);
        model.decodeMtl(mtlFile);
        model.fromObj(objFile);

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

        for (const { fillFront, fillBack } of this.faces) {
            const iFront = fillFront ? fillFront.i : -1;
            const iBack = fillBack ? fillBack.i : -1;

            data[offset++] = iFront === 0 || iBack === 0 ? 0 : 1;
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
                //lines.push(`map_d ${textureName}.png`);
            } else {
                const { r, g, b } = parsedFill;

                lines.push(
                    `Kd ${encodeRGB(r)} ${encodeRGB(g)} ${encodeRGB(b)}`
                );
            }

            const { i: illum } = parsedFill;
            lines.push(`illum ${illum}`);

            lines.push('');
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
                    uvs.push(
                        ...unwrapUVs(
                            vertices.map((index) => {
                                return this.vertices[index];
                            })
                        )
                    );
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

        objLines.push(
            ...uvs.map(({ u, v }) => {
                return `vt ${u.toFixed(6)} ${v.toFixed(6)}`;
            })
        );

        objLines.push('');

        objLines.push(...faceLines);

        return objLines.join('\n') + '\n';
    }

    getObj() {
        const lines = [GENERATED_BY, `mtllib ${this.name}.mtl`, ''];

        const back = this.getObjModel();
        const front = this.getObjModel(true);

        return lines.join('\n') + back + front;
    }

    decodeMtl(mtlFile) {
        this.materials.clear();

        let material = null;
        let materialName = null;

        const mtlLines = mtlFile.split('\n');

        for (const line of mtlLines) {
            const split = line.split(' ');
            const property = split.shift();

            if (property === 'newmtl') {
                materialName = split.join(' ');
                material = { i: 1 };

                this.materials.set(materialName, material);
            } else if (property === 'Kd') {
                const [r, g, b] = split;

                material.r = Math.floor(Number(r) * 248);
                material.g = Math.floor(Number(g) * 248);
                material.b = Math.floor(Number(b) * 248);

                // #f0f's are null
                if (
                    material.r > 0.999 &&
                    material.g < 0.001 &&
                    material.b > 0.999
                ) {
                    this.materials.set(materialName, null);
                }
            } else if (property === 'map_Kd') {
                const textureName = split.join(' ').split('.')[0];
                const textureIndex = this.textureNames.indexOf(textureName);

                if (textureIndex < 0) {
                    throw new RangeError(
                        `texture ${textureName} not found. pack with ` +
                            'rsc-sprites and rsc-config'
                    );
                }

                material.texture = textureIndex;

                delete material.r;
                delete material.g;
                delete material.b;
            } else if (property === 'illum') {
                material.i = Number.parseInt(split[0], 10);
            }
        }
    }

    decodeObjModel(model, front = false) {
        if (!front) {
            this.vertices = model.vertices.map(({ x, y, z }) => {
                return {
                    x: decodeVertex(x),
                    y: decodeVertex(-y),
                    z: decodeVertex(z)
                };
            });

            this.faces = model.faces.map((face) => {
                const vertices = face.vertices.map(({ vertexIndex }) => {
                    return vertexIndex - 1;
                });

                const material = this.materials.get(face.material);

                return {
                    fillFront: null,
                    fillBack: material,
                    vertices
                };
            });
        } else {
            for (const [i, face] of this.faces.entries()) {
                face.fillFront = this.materials.get(model.faces[i].material);
            }
        }
    }

    fromObj(objFile) {
        const [back, front] = new OBJFile(objFile).parse().models;

        this.decodeObjModel(back);

        if (front) {
            this.decodeObjModel(front, true);
        }

        this.updateFillIDs();
    }

    toJSON() {
        return {
            name: this.name,
            vertices: this.vertices,
            faces: this.faces
        };
    }
}

module.exports = Model;
