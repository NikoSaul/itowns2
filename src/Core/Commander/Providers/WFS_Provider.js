/**
 * Generated On: 2016-03-5
 * Class: WFS_Provider
 * Description: Provides data from a WFS stream
 */

import * as THREE       from 'THREE';
import {UNIT}           from 'Core/Geographic/GeoCoordinate';
import FeatureMesh      from 'Renderer/FeatureMesh';
import Provider         from 'Core/Commander/Providers/Provider';
import IoDriver_JSON    from 'Core/Commander/Providers/IoDriver_JSON';
import IoDriverXML      from 'Core/Commander/Providers/IoDriverXML';
import defaultValue     from 'Core/defaultValue';
import Projection       from 'Core/Geographic/Projection';
import CacheRessource   from 'Core/Commander/Providers/CacheRessource';
import BoundingBox      from 'Scene/BoundingBox';
import FeatureToolBox   from 'Renderer/ThreeExtented/FeatureToolBox';
import BuilderEllipsoidTile from 'Globe/BuilderEllipsoidTile';

/**
 * Return url wmts MNT
 * @param {String} options.url: service base url
 * @param {String} options.layer: requested data layer
 * @param {String} options.format: image format (default: format/jpeg)
 * @returns {Object@call;create.url.url|String}
 */
var tool        = new FeatureToolBox();
var projection  = new Projection();
function WFS_Provider(/*options*/) {
    Provider.call(this, new IoDriver_JSON());
    this.cache          = CacheRessource();
    this.ioDriverXML    = new IoDriverXML();
}

WFS_Provider.prototype = Object.create(Provider.prototype);
WFS_Provider.prototype.constructor = WFS_Provider;

WFS_Provider.prototype.url = function(coord, layer) {
    var bbox;
    if (layer.axisOrder == 'ordered')
        bbox = coord.south(UNIT.DEGREE) + "," + coord.west(UNIT.DEGREE) + "," +
               coord.north(UNIT.DEGREE) + "," + coord.east(UNIT.DEGREE);
    else
        bbox = coord.west(UNIT.DEGREE) + "," + coord.south(UNIT.DEGREE) + "," +
               coord.east(UNIT.DEGREE) + "," + coord.north(UNIT.DEGREE);
    var urld = layer.customUrl.replace('%bbox', bbox.toString());
    return urld;
};

WFS_Provider.prototype.preprocessDataLayer = function(layer){
    if(!layer.title)
        throw new Error('layerName is required.');

    layer.format    = defaultValue(layer.options.mimetype, "json"),
    layer.crs       = defaultValue(layer.projection, "EPSG:4326"),
    layer.version   = defaultValue(layer.version, "1.3.0"),
    layer.bbox      = defaultValue(layer.bbox, [-180, -90, 90, 180]);
    layer.customUrl = layer.url +
                      'SERVICE=WFS&REQUEST=GetFeature&typeName=' + layer.title +
                      '&VERSION=' + layer.version +
                      '&SRSNAME=' + layer.crs +
                      '&outputFormat=' + layer.format +
                      '&BBOX=%bbox,' + layer.crs;
};

WFS_Provider.prototype.preprocessDataForTileSet = function(layer) {
    layer.protocol = 'wfs';
    layer.isTileset = true;
    layer.type = 'bbox';
    layer.format  = 'text/json';
};

WFS_Provider.prototype.tileInsideLimit = function(tile,layer) {
    var bbox = new BoundingBox(layer.bbox[0],layer.bbox[2],layer.bbox[1],layer.bbox[3],0, 0,UNIT.DEGREE);
    if(layer.isTileset)
        return bbox.intersect(tile.bbox);
    var currentLevel = 17;
    if(layer.params && layer.params.level)
        currentLevel = layer.params.level;
    return (tile.level == currentLevel) && bbox.intersect(tile.bbox);
};

WFS_Provider.prototype.executeCommand = function(command) {
    var layer = command.paramsFunction.layer;
    var tile = command.requester;

    //TODO : support xml, gml2, geojson
    var supportedFormats = {
        json:    this.getFeatures.bind(this),
        geojson: this.getFeatures.bind(this),
        'text/json': this.getFeatures.bind(this)
    };

    var func = supportedFormats[layer.format];
    if (func) {
        return func(tile, layer, command.paramsFunction).then(function(result) {
            return command.resolve(result);
        });
    } else {
        return Promise.reject(new Error('Unsupported mimetype ' + layer.format));
    }
};

/*WFS_Provider.prototype.getTileFeatures = function(tile, layer, parameters) {
    if (!this.tileInsideLimit(tile,layer) || tile.material === null)
        return Promise.resolve();
    this._IoDriver.read(layer.root.content.url).then(function(feature) {
        console.log(feature);
    });
};*/

var builder  = new BuilderEllipsoidTile(tool.ellipsoid, projection);
WFS_Provider.prototype.getFeatures = function(tile, layer, parameters) {
    if (!this.tileInsideLimit(tile,layer) || tile.material === null)
        return Promise.resolve();

    var pitch = parameters.ancestor ?
                this.projection.WMS_WGS84Parent(tile.bbox, parameters.ancestor.bbox) :
                new THREE.Vector3(0, 0, 1);
    var bbox = parameters.ancestor ?
                parameters.ancestor.bbox :
                tile.bbox;

    var url = layer.tileUrl || this.url(bbox, layer);

    var result = { pitch: pitch };
    result.feature = this.cache.getRessource(url);

    if (result.feature !== undefined && layer.params.retail == undefined)
        return Promise.resolve(result);

    return this._IoDriver.read(url).then(function(feature) {
        if(feature.crs || feature.geometries.crs) {
            let pointOrder, features;
            if(feature.crs) {
                pointOrder = this.CheckOutputType(feature.crs);
                features = feature.features;
            } else {
                pointOrder = this.CheckOutputType(feature.geometries.crs);
                features = feature.geometries.features;
            }
            if(pointOrder != undefined) {
                if(layer.type == "poly")
                    result.feature = tool.GeoJSON2Polygon(features, pointOrder);
                else if(layer.type == "bbox")
                    result.feature = tool.GeoJSON2Box(features, pointOrder, layer.bbox);
                else {
                    let mesh;
                    if(result.feature != undefined)
                        mesh = result.feature;
                    else{
                        mesh = new FeatureMesh({ bbox: bbox }, builder);
                    }
                    if((mesh.currentType == undefined && (layer.type == "point" || layer.type == "box"))
                            || mesh.currentType == "point" || mesh.currentType == "box") {
                        let geometry = tool.GeoJSON2Point(features, bbox, layer, tile, mesh.currentType || layer.type, pointOrder);
                        mesh.setGeometry(geometry);
                        if(mesh.currentType === undefined)
                            mesh.currentType = layer.type;
                    } else if(layer.type == "line") {
                        let geometry = tool.GeoJSON2Line(features, bbox, layer, pointOrder);
                        mesh.setGeometry(geometry);
                    } else
                        return result;
                    result.feature = mesh;
                }

                if (result.feature !== undefined){
                    //Is needed to do another request for the retail level change
                    if(result.feature.layer == null)
                        result.feature.layer = layer;
                    this.cache.addRessource(url, result.feature);
                }
            }
        }
        return result;
    }.bind(this)).catch(function(/*reason*/) {
            result.feature = null;
            return result;
        });
};

WFS_Provider.prototype.CheckOutputType = function(crs) {
    var pointOrder = {
        lat:  0,
        long: 1
    };
    if(crs.type == 'EPSG' && crs.properties.code == '4326') {
        pointOrder.long = 0;
        pointOrder.lat  = 1;
        return pointOrder;
    }
    else if(crs.type == 'name') {
        if(crs.properties.name) {
            var regExpEpsg = new RegExp(/^(urn:[x-]?ogc:def:crs:)?EPSG:(\d*.?\d*:)?\d{4}/);
            if(regExpEpsg.test(crs.properties.name))
                return pointOrder;
            else {
                var regExpOgc = new RegExp(/^urn:[x-]?ogc:def:crs:OGC:(\d*.?\d*)?:(CRS)?(WSG)?\d{0,2}/);
                if(regExpOgc.test(crs.properties.name)) {
                    pointOrder.long = 0;
                    pointOrder.lat  = 1;
                    return pointOrder;
                } else
                    return undefined;
            }
        } else
            return undefined
    } else
        return undefined;
};

export default WFS_Provider;
