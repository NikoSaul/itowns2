import * as THREE from 'three';

export default {
    parse: function parse(buffer, layer) {
        if (!buffer) {
            throw new Error('No array buffer provided.');
        }

        const array = new Uint8Array(buffer);
        const view = new DataView(buffer);

        let byteOffset = 0;
        const pntsHeader = {};

        // Magic type is unsigned char [4]
        pntsHeader.magic = decodeFromCharCode(array.subarray(byteOffset, 4));
        byteOffset += 4;

        if (pntsHeader.magic) {
            // Version, byteLength, batchTableJSONByteLength, batchTableBinaryByteLength and batchTable types are uint32
            pntsHeader.version = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            pntsHeader.byteLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            pntsHeader.FTJSONLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            pntsHeader.FTBinaryLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            pntsHeader.BTJSONLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            pntsHeader.BTBinaryLength = view.getUint32(byteOffset, true);
            byteOffset += Uint32Array.BYTES_PER_ELEMENT;

            // binary table
            if (pntsHeader.FTBinaryLength > 0) {
                // readTestFT(array, byteOffset, pntsHeader.FTJSONLength);
                return parseFeatureBinary(array, byteOffset, pntsHeader.FTJSONLength, buffer, layer);
            }

            // batch table
          /*
            if (pntsHeader.BTBinaryLength > 0) {
                console.log('BTB');
            }
            */
        } else {
            throw new Error('Invalid pnts file.');
        }
    },
};

function parseFeatureBinary(array, byteOffset, FTJSONLength, buffer, layer) {
    const subArrayJson = decodeFromCharCode(array.subarray(byteOffset, FTJSONLength + byteOffset));
    const parseJSON = JSON.parse(subArrayJson);

    const view = new Float32Array(buffer);
    let lengthFeature;

    if (parseJSON.POINTS_LENGTH) {
        lengthFeature = parseJSON.POINTS_LENGTH;
    }

    if (parseJSON.POSITION)
    {
        const byteOffsetPos = (parseJSON.POSITION.byteOffset + subArrayJson.length + byteOffset) / 4;
        const positionArray = new Float32Array(view.subarray(byteOffsetPos, (lengthFeature * 3) + byteOffsetPos));
        if (parseJSON.RGB) {
            const byteOffsetCol = parseJSON.RGB.byteOffset + subArrayJson.length + byteOffset;
            const colorArray = new Uint8Array(array.subarray(byteOffsetCol, (lengthFeature * 3) + byteOffsetCol));
            return createGeometryPoints(positionArray, colorArray, lengthFeature, layer);
        }
    }
}

/*
  create the geometry points with the parse binarytable
*/
function createGeometryPoints(positions, colors, numPoints, layer)
{
    const geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3, true));

    const material = new THREE.PointsMaterial({ size: 0.05, vertexColors: THREE.VertexColors, sizeAttenuation: true });
    const points = new THREE.Points(geometry, material);

    points.layers.set(layer);
    points.realPointCount = numPoints;

    return points;
}

/*
    read Feature table json header
*/
/*
function readTestFT(array, byteOffset, FTJSONLength) {
    console.log(decodeFromCharCode(array.subarray(byteOffset, FTJSONLength + byteOffset))); // 28 - 8 byte of header
}
*/

function decodeFromCharCode(value) {
    var result = '';
    for (var i = 0; i < value.length; i++) {
        result += String.fromCharCode(value[i]);
    }
    return result;
}
