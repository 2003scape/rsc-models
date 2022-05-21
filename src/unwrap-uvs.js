const getPlaneNormal = require('get-plane-normal');

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

function vertexToArray({ x, y, z }) {
    return [x, y, z];
}

function arrayToVertex([x, y, z]) {
    return { x, y, z };
}

function uvSort(uvs) {
    const centre = { u: 0, v: 0 };

    for (const vertex of uvs) {
        centre.u += vertex.u;
        centre.v += vertex.v;
    }

    centre.u /= uvs.length;
    centre.v /= uvs.length;

    // TODO may remove
    //centre.u = 0.5;
    //centre.v = 0.5;

    for (const uv of uvs) {
        uv.angle = Math.atan2(uv.v - centre.v, uv.u - centre.u);
    }

    return uvs.sort((a, b) => {
        if (a.angle > b.angle) {
            return -1;
        }

        if (a.angle < b.angle) {
            return 1;
        }

        return 0;
    });
}

// find the most-obvious 2D shape out of a face by creating a 2D polygon
// mapping two of the three planes (either (x, y), (x, z), (y, z))
function unwrapUVs(vertices) {
    const normal = arrayToVertex(
        getPlaneNormal(
            [],
            vertexToArray(vertices[0]),
            vertexToArray(vertices[1]),
            vertexToArray(vertices[vertices.length - 1])
        )
    );

    let uPlane = 'x';
    let vPlane = 'y';

    if (
        Math.abs(normal.x) > Math.abs(normal.y) &&
        Math.abs(normal.x) > Math.abs(normal.z)
    ) {
        uPlane = 'z';
        vPlane = 'y';
    } else if (
        Math.abs(normal.y) > Math.abs(normal.x) &&
        Math.abs(normal.y) > Math.abs(normal.z)
    ) {
        uPlane = 'x';
        vPlane = 'z';
    } else if (
        Math.abs(normal.z) > Math.abs(normal.x) &&
        Math.abs(normal.z) > Math.abs(normal.y)
    ) {
        uPlane = 'x';
        vPlane = 'y';
    } else if (
        Math.abs(normal.x) < Math.abs(normal.y) &&
        Math.abs(normal.x) < Math.abs(normal.z)
    ) {
        uPlane = 'x';
        vPlane = 'y';
    } else if (
        Math.abs(normal.z) < Math.abs(normal.x) &&
        Math.abs(normal.z) < Math.abs(normal.y)
    ) {
        uPlane = 'z';
        vPlane = 'y';
    } else {
        //throw new Error("unable to unwrap UVs (can't figure out orientation)");
    }

    const minU = getMinPlane(vertices, uPlane);
    const lengthU = getMaxPlane(vertices, uPlane) - minU;

    const minV = getMinPlane(vertices, vPlane);
    const lengthV = getMaxPlane(vertices, vPlane) - minV;

    const uvs = [];

    for (const vertex of vertices) {
        let u = Math.abs(vertex[uPlane] - minU) / lengthU;
        let v = Math.abs(vertex[vPlane] - minV) / lengthV;

        if (normal[uPlane] > 0) {
            u = 1.0 - u;
        }

        if (normal[vPlane] < 0) {
            v = 1.0 - v;
        }

        uvs.push({ u, v });
    }

    return uvSort(uvs);
}

module.exports = unwrapUVs;
