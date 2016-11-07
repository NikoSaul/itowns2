/**
 * Generated On: 2015-10-5
 * Class: BuildingTileNodeProcess
 * Description: BuildingTileNodeProcess effectue une opération sur un Node.
 */

import RendererConstant from 'Renderer/RendererConstant'

function BuildingTileNodeProcess(engine) {
    //Constructor
    this.additiveRefinement = true;
    this.engine = engine;
}

BuildingTileNodeProcess.prototype.updateCamera = function() {
};

/**
 * @documentation:
 * @param  {type} node  : the node to try to cull
 * @param  {type} camera: the camera used for culling
 * @return {Boolean}      the culling attempt's result
 */
BuildingTileNodeProcess.prototype.isCulled = function(node, camera) {
    return !(this.frustumCulling(node, camera));
};

BuildingTileNodeProcess.prototype.computeNodeSSE = function(node, camera) {
    var distance = node.box3D.distanceToPoint(camera.camera3D.position);
    var SSE = camera.preSSE * (node.geometricError / distance);
    return SSE;
};


BuildingTileNodeProcess.prototype.checkNodeSSE = function(node) {

    return 6.0 < node.sse;

};

BuildingTileNodeProcess.prototype.isVisible = function(node, camera) {
    return !this.isCulled(node, camera) && this.checkSSE(node, camera);
};

BuildingTileNodeProcess.prototype.traverseChildren = function(node) {
    return node.visible;
};

BuildingTileNodeProcess.prototype.subdivideNode = function(node, camera, params) {
    if (!node.pendingSubdivision && node.noChild()) {
        var bboxes = params.tree.subdivideNode(node);
        node.pendingSubdivision = true;

        for (var i = 0; i < bboxes.length; i++) {
            var args = {
                layer: params.layersConfig.getGeometryLayers()[1],
                bbox: bboxes[i].bbox,
                bboxId: bboxes[i].id
            };

            params.tree.interCommand.request(args, node).then(function(child) {
                child.materials[RendererConstant.FINAL].uniforms.normalTexture.value = this.engine.normalRenderBuffer.texture;
                child.materials[RendererConstant.FINAL].uniforms.resolution.value = [this.engine.normalRenderBuffer.width, this.engine.normalRenderBuffer.height];
                if(node.childrenBboxes.length === node.children.length) {
                    node.pendingSubdivision = false;
                }
            }.bind(this));
        }
    }
};

BuildingTileNodeProcess.prototype.SSE = function(node, camera, params) {
    // update node's sse value

    node.sse = this.computeNodeSSE(node, camera);

    var sse = this.checkNodeSSE(node);
    node.setDisplayed(true);

    if (params.withUp) {
        if (sse) {
            // big screen space error: subdivide node
            this.subdivideNode(node, camera, params);
        }
    }
};

/**
 * @documentation: Cull node with frustrum and oriented bounding box of node
 * @param {type} node
 * @param {type} camera
 * @returns {BuildingTileNodeProcess_L7.BuildingTileNodeProcess.prototype.frustumCullingOBB.node@pro;camera@call;getFrustum@call;intersectsBox}
 */

BuildingTileNodeProcess.prototype.frustumCulling = function(node, camera) {
    return camera.getFrustum().intersectsBox(node.box3D);
};

/**
 * @documentation: Pre-computing for the upcoming processes
 * @param  {type} camera
 */
BuildingTileNodeProcess.prototype.prepare = function( /*camera*/ ) {

};


export default BuildingTileNodeProcess;
