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
    //console.log(vertices);

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

module.exports = unwrapUVs;
