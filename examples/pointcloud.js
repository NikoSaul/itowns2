/* global itowns, debug, dat, renderere*/

// eslint-disable-next-line no-unused-vars
function showPointcloud(serverUrl, fileName, lopocsTable) {
    var pointcloud;
    var oldPostUpdate;
    var viewerDiv;
    var debugGui;
    var view;
    var controls;
    var flyControls;
    var positionCollada ;

    viewerDiv = document.getElementById('viewerDiv');
    viewerDiv.style.display = 'block';

    itowns.THREE.Object3D.DefaultUp.set(0, 0, 1);

    // Define projection that we will use (taken from https://epsg.io/3946, Proj4js section)
    itowns.proj4.defs('EPSG:32737',
        '+proj=utm +zone=37 +south +ellps=WGS84 +datum=WGS84 +units=m +no_defs');

    // Add image of background - - -  - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
    const extent = new itowns.Extent(
        'EPSG:32737',
        531846.98189, 534923.2478,
        9364932.41101, 9367847.98341);

    debugGui = new dat.GUI();
    // Add an WMS imagery layer (see WMS_Provider* for valid options)
    // TODO: do we really need to disable logarithmicDepthBuffer ?
    view = new itowns.PlanarView(viewerDiv, extent, { renderer: renderer });
    view.mainLoop.gfxEngine.renderer.setClearColor(0xcccccc);

    // Configure Point Cloud layer
    pointcloud = new itowns.GeometryLayer('pointcloud', view.scene);
    pointcloud.file = fileName || 'infos/sources';
    pointcloud.protocol = 'potreeconverter';
    pointcloud.url = serverUrl;
    pointcloud.table = lopocsTable;

    // point selection on double-click
    function dblClickHandler(event) {
        var pick;
        var mouse = {
            x: event.offsetX,
            y: (event.currentTarget.height || event.currentTarget.offsetHeight) - event.offsetY,
        };

        pick = itowns.PointCloudProcessing.selectAt(view, pointcloud, mouse);

        if (pick) {
            console.log('Selected point #' + pick.index + ' in Points "' + pick.points.owner.name + '"');
        }
    }
    view.mainLoop.gfxEngine.renderer.domElement.addEventListener('dblclick', dblClickHandler);


    function placeCamera(position, lookAt) {
        positionCollada = position;
        view.camera.camera3D.position.set(position.x, position.y, position.z);
        // view.camera.camera3D.position.set(0,0,0);
        view.camera.camera3D.lookAt(lookAt);
        // create controls
        controls = new itowns.FirstPersonControls(view, { focusOnClick: true });
        debugGui.add(controls, 'moveSpeed', 1, 100).name('Movement speed');

        view.notifyChange(true);
    }

    // add pointcloud to scene
    function onLayerReady() {
        var ratio;
        var position;
        var lookAt;

        debug.PointCloudDebug.initTools(view, pointcloud, debugGui);

        view.camera.camera3D.far = 2.0 * pointcloud.root.bbox.getSize().length();

        ratio = pointcloud.root.bbox.getSize().x / pointcloud.root.bbox.getSize().z;
        position = pointcloud.root.bbox.min.clone().add(
            pointcloud.root.bbox.getSize().multiply({ x: 0, y: 0, z: ratio * 0.5 }));
        lookAt = pointcloud.root.bbox.getCenter();
        lookAt.z = pointcloud.root.bbox.min.z;
        placeCamera(position, lookAt);
        controls.moveSpeed = pointcloud.root.bbox.getSize().length() / 3;

        // update stats window
        oldPostUpdate = pointcloud.postUpdate;
        pointcloud.postUpdate = function postUpdate() {
            var info = document.getElementById('info');
            oldPostUpdate.apply(pointcloud, arguments);
            info.textContent = 'Nb points: ' +
                pointcloud.counters.displayedCount.toLocaleString() + ' (' +
                Math.floor(100 * pointcloud.counters.displayedCount / pointcloud.counters.pointCount) + '%) (' +
                view.mainLoop.gfxEngine.renderer.info.memory.geometries + ')';
        };
    }

    itowns.View.prototype.addLayer.call(view, pointcloud).then(onLayerReady);

    // Add bbackground - - - -  - - - -  - - - -
    view.tileLayer.disableSkirt = true;
    // Add an WMS imagery layer (see WMS_Provider* for valid options)
   view.addLayer({
     url: 'http://localhost:8080/geoserver/Zanzibar/wms',
        networkOptions: { crossOrigin: 'anonymous' },
        type: 'color',
        protocol: 'wms',
        version: '1.3.0',
        id: 'wms_imagery',
        name: 'Zanzibar_Layer_orthophoto',
        projection: 'EPSG:32737',
        axisOrder: 'wsen',
        tiled: 'true',
        options: {
            mimetype: 'image/png',
        },
    });



    // ELEVATION :
    view.addLayer({
        url: 'http://localhost:8080/geoserver/Zanzibar/wms',
        type: 'elevation',
        protocol: 'wms',
        networkOptions: { crossOrigin: 'anonymous' },
        version: '1.1.0',
        id: 'wms_elevation',
        name: 'Zanzibar_Layer_elevation',
        projection: 'EPSG:32737',
        axisOrder: 'wsen',
        heightMapWidth: 256,
        options: {
            mimetype: 'image/png',
        },
    });
    // Since the elevation layer use color textures, specify min/max z
    view.tileLayer.materialOptions = {
        useColorTextureElevation: true,
        colorTextureElevationMinZ: -31.1516,
        colorTextureElevationMaxZ: 4,
    };

/// // /
/*
    // Building- - - - - -- - - - - - - -- - - -- - - - - - - - -
    var object;
    var loadingManager = new THREE.LoadingManager( function() {

      view.scene.add( object );

    } );

    var loader = new THREE.ColladaLoader(loadingManager);
  	loader.options.convertUpAxis = true;
		loader.load( 'http://localhost:8003/modele/Edifice_01/Klauwaerts-NON-TEXTURE.dae', function ( collada ) {
			object = collada.scene;
			// object.scale.set( 1, 1, 1 );
      object.position.set(positionCollada.x, positionCollada.y, positionCollada.z);
      console.log(positionCollada);
      object.updateMatrixWorld();
		} );

    // add light
    var AmbientLight = new THREE.AmbientLight( 0xffffff );
    AmbientLight.position.set(449588.55700000003, 6200917.614, 3454.564500000003 + 1000 ).normalize();
    view.scene.add( AmbientLight );*/

}
