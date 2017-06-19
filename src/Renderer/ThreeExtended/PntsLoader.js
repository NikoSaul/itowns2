import * as THREE from 'three';

const textDecoder = new TextDecoder('utf-8');
export default {
    parse: function parse(buffer) {
        if (!buffer) {
            throw new Error('No array buffer provided.');
        }
        const array = new Uint8Array(buffer);
        const view = new DataView(buffer);

        let byteOffset = 0;
        const pntsHeader = {};

        // Magic type is unsigned char [4]
        pntsHeader.magic = textDecoder.decode(new Uint8Array(array.subarray(byteOffset, 4)));
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
                return parseFeatureBinary(array, byteOffset, pntsHeader.FTJSONLength, buffer);
            }

            // batch table
            if (pntsHeader.BTBinaryLength > 0) {
                throw new Error('For pnts loader, BTBinaryLength: not yet managed');
            }
        } else {
            throw new Error('Invalid pnts file.');
        }
    },
};

function parseFeatureBinary(array, byteOffset, FTJSONLength, view) {
    // Init geometry
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.PointsMaterial({ size: 0.05, vertexColors: THREE.VertexColors, sizeAttenuation: true });

    // init Array feature binary
    const subArrayJson = textDecoder.decode(new Uint8Array(array.subarray(byteOffset, FTJSONLength + byteOffset)));
    const parseJSON = JSON.parse(subArrayJson);
    let lengthFeature;
    if (parseJSON.POINTS_LENGTH) {
        lengthFeature = parseJSON.POINTS_LENGTH;
    }
    if (parseJSON.RTC_CENTER) {
        geometry.RTC = parseJSON.RTC_CENTER;
    }
    if (parseJSON.POSITION) {
        const byteOffsetPos = (parseJSON.POSITION.byteOffset + subArrayJson.length + byteOffset);
        const positionArray = new Float32Array(view, byteOffsetPos, lengthFeature * 3);
        geometry.addAttribute('position', new THREE.BufferAttribute(positionArray, 3));
    }
    if (parseJSON.RGB) {
        const byteOffsetCol = parseJSON.RGB.byteOffset + subArrayJson.length + byteOffset;
        const colorArray = new Uint8Array(view, byteOffsetCol, lengthFeature * 3);
        geometry.addAttribute('color', new THREE.BufferAttribute(colorArray, 3, true));
    }
    if (parseJSON.POSITION_QUANTIZED) {
        throw new Error('For pnts loader, POSITION_QUANTIZED: not yet managed');
    }
    if (parseJSON.RGBA) {
        throw new Error('For pnts loader, RGBA: not yet managed');
    }
    if (parseJSON.RGB565) {
        throw new Error('For pnts loader, RGB565: not yet managed');
    }
    if (parseJSON.NORMAL) {
        throw new Error('For pnts loader, NORMAL: not yet managed');
    }
    if (parseJSON.NORMAL_OCT16P) {
        throw new Error('For pnts loader, NORMAL_OCT16P: not yet managed');
    }
    if (parseJSON.BATCH_ID) {
        throw new Error('For pnts loader, BATCH_ID: not yet managed');
    }
    // creation points with geometry and material
    const points = new THREE.Points(geometry, material);
    points.realPointCount = lengthFeature;
    points.RTC = geometry.RTC;
    return points;
}
