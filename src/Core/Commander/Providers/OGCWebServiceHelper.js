import * as THREE from 'three';
import Fetcher from './Fetcher';
import CacheRessource from './CacheRessource';
import IoDriver_XBIL from './IoDriver_XBIL';
import Projection from '../../Geographic/Projection';
import CoordWMTS from '../../Geographic/CoordWMTS';


export const SIZE_TEXTURE_TILE = 256;

// CacheRessource is necessary for neighboring PM textures
// The PM textures overlap several tiles WGS84, it is to avoid net requests
// Info : THREE.js have cache image https://github.com/mrdoob/three.js/blob/master/src/loaders/ImageLoader.js#L25
const cache = CacheRessource();
const cachePending = new Map();
const ioDXBIL = new IoDriver_XBIL();
const projection = new Projection();

const getTextureFloat = function getTextureFloat(buffer) {
    const texture = new THREE.DataTexture(buffer, SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE, THREE.AlphaFormat, THREE.FloatType);
    texture.needsUpdate = true;
    return texture;
};

export default {
    ioDXBIL,
    getColorTextureByUrl(url) {
        const cachedTexture = cache.getRessource(url);

        if (cachedTexture) {
            return Promise.resolve(cachedTexture);
        }

        const { texture, promise } = Fetcher.texture(url);

        texture.generateMipmaps = false;
        texture.magFilter = THREE.LinearFilter;
        texture.minFilter = THREE.LinearFilter;
        texture.anisotropy = 16;

        return promise.then(() => {
            if (!cache.getRessource(url)) {
                cache.addRessource(url, texture);
            }
            return texture;
        });
    },
    getXBilTextureByUrl(url) {
        const textureCache = cache.getRessource(url);

        if (textureCache !== undefined) {
            return Promise.resolve({ texture: textureCache });
        }

        const promiseXBil = (cachePending.get(url) || ioDXBIL.read(url)).then((result) => {
            // TODO  RGBA is needed for navigator with no support in texture float
            // In RGBA elevation texture LinearFilter give some errors with nodata value.
            // need to rewrite sample function in shader

            // loading concurrence
            const textureConcurrence = cache.getRessource(url);
            if (textureConcurrence) {
                cachePending.delete(url);
                return textureConcurrence;
            }

            result.texture = getTextureFloat(result.floatArray);
            result.texture.generateMipmaps = false;
            result.texture.magFilter = THREE.LinearFilter;
            result.texture.minFilter = THREE.LinearFilter;
            cache.addRessource(url, result.texture);
            cachePending.delete(url);

            return result;
        });

        cachePending.set(url, promiseXBil);

        return promiseXBil;
    },
    computeTileMatrixSetCoordinates(tile, tileMatrixSet) {
        // Are WMTS coordinates ready?
        if (!tile.wmtsCoords) {
            tile.wmtsCoords = {};
        }

        tileMatrixSet = tileMatrixSet || 'WGS84G';
        if (!(tileMatrixSet in tile.wmtsCoords)) {
            const tileCoord = projection.WGS84toWMTS(tile.bbox);

            tile.wmtsCoords[tileMatrixSet] =
                projection.getCoordWMTS_WGS84(tileCoord, tile.bbox, tileMatrixSet);
        }
    },
    WMTS_WGS84Parent(cWMTS, levelParent, pitch) {
        const diffLevel = cWMTS.zoom - levelParent;
        const diff = Math.pow(2, diffLevel);
        const invDiff = 1 / diff;

        const r = (cWMTS.row - (cWMTS.row % diff)) * invDiff;
        const c = (cWMTS.col - (cWMTS.col % diff)) * invDiff;

        if (pitch) {
            pitch.x = cWMTS.col * invDiff - c;
            pitch.y = cWMTS.row * invDiff - r;
            pitch.z = invDiff;
        }

        return new CoordWMTS(levelParent, r, c);
    },
};
