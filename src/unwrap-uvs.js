const glm = require('glm-js');

function vertexToVec3({ x, y, z }) {
    return glm.vec3(x, y, z);
}

// https://github.com/polygon-city/points-3d-to-2d
// http://stackoverflow.com/a/26370192/997339
function unwrapUVs(vertices) {
    vertices = vertices.map((vertex) => vertexToVec3(vertex));

    const origin = vertices[0];
    let locationX = glm.sub(vertices[1], vertices[0]);
    const normal = glm.cross(locationX, glm.sub(vertices[2], origin));
    const locationY = glm.normalize(glm.cross(normal, locationX));
    locationX = glm.normalize(locationX);

    let maxX = 0;
    let minX = 0;

    let maxY = 0;
    let minY = 0;

    const points = vertices.map((vertex, index) => {
        vertex = glm.sub(vertex, origin);

        const x = glm.dot(vertex, locationX);
        const y = glm.dot(vertex, locationY);

        if (index === 0 || x > maxX) {
            maxX = x;
        }

        if (index === 0 || x < minX) {
            minX = x;
        }

        if (index === 0 || y > maxY) {
            maxY = y;
        }

        if (index === 0 || y < minY) {
            minY = y;
        }

        return { x, y };
    });

    const uvs = points.map(({x, y}) => ({
        u: +((x - minX) / (maxX - minX)).toFixed(6),
        v: +(1 - (y - minY) / (maxY - minY)).toFixed(6)
    }));

    return uvs;
}

module.exports = unwrapUVs;
