/*
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */

/*
 * A Faire
 * Les tuiles de longitude identique ont le maillage et ne demande pas 1 seule calcul pour la génération du maillage
 *
 *
 *
 *
 */

import Provider from './Provider';
import TileGeometry from '../../../Globe/TileGeometry';
import OGCWebServiceHelper, { SIZE_TEXTURE_TILE } from './OGCWebServiceHelper';
import { EMPTY_TEXTURE_ZOOM, l_ELEVATION } from '../../../Renderer/LayeredMaterial';
import TileMesh from '../../../Globe/TileMesh';

function TileProvider() {
    Provider.call(this, null);
}

TileProvider.prototype = Object.create(Provider.prototype);

TileProvider.prototype.constructor = TileProvider;

TileProvider.prototype.executeCommand = function executeCommand(command) {
    var bbox = command.bbox;

    var parent = command.requester;

    // build tile
    var params = {
        bbox,
        level: (command.level === undefined) ? (parent.level + 1) : command.level,
        segment: 16,
        parentMaterial: parent ? parent.material : null,
        parentWmtsCoords: parent ? parent.wmtsCoords : null,
    };

    const geometry = new TileGeometry(params, command.layer.builder);

    var tile = new TileMesh(geometry, params);

    tile.layer = command.layer.id;
    tile.layers.set(command.threejsLayer);
    tile.setUuid();
    tile.geometricError = Math.pow(2, (18 - params.level));

    if (parent) {
        parent.worldToLocal(params.center);
    }

    tile.position.copy(params.center);
    tile.setVisibility(false);
    tile.updateMatrix();

    // update bbox if node herits texture elevation from parent
    if (tile.material.getElevationLayerLevel() > EMPTY_TEXTURE_ZOOM) {
        const textureElevation = tile.material.getLayerTextures(l_ELEVATION)[0];
        const { min, max } = OGCWebServiceHelper.ioDXBIL.computeMinMaxElevation(
                textureElevation.image.data,
                SIZE_TEXTURE_TILE, SIZE_TEXTURE_TILE,
                tile.material.offsetScale[0][0]);

        if (min && max) {
            tile.setBBoxZ(min, max);
        }
    }

    return Promise.resolve(tile);
};

export default TileProvider;
