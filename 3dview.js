import { compute_p_and_l_data_for_price, env } from './script.js';

export let renderer;
export let x_camera = 20;
export let y_camera = 20;
export let z_camera = 5;

export let cameraPosition = {
    x: 17,
    y: 17,
    z: 4,
    fov: 40,
    z_rotation: -2.0,
    z_zoom_factor: 1,
};
const ref_plane_half_size = 5;


function create_reference_plane() {
    let reference_plane = new THREE.Group();
    let points;
    let geometry;
    let material;
    let line;

    for (let i = -ref_plane_half_size; i <= ref_plane_half_size; i++) {

        points = [
            new THREE.Vector3(i, -ref_plane_half_size, 0),  // Starting point
            new THREE.Vector3(i, ref_plane_half_size, 0)   // Ending point
        ];

        // Create a geometry for the line
        geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Create a material for the line (red)
        material = new THREE.LineBasicMaterial({ color: 0xff0000 });

        // Create the line using the geometry and material
        line = new THREE.Line(geometry, material);
        reference_plane.add(line);  // Add the cube mesh

        points = [
            new THREE.Vector3(-ref_plane_half_size, i, 0),  // Starting point
            new THREE.Vector3(ref_plane_half_size, i, 0)   // Ending point
        ];

        // Create a geometry for the line
        geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Create a material for the line (red)
        material = new THREE.LineBasicMaterial({ color: 0xff0000 });

        // Create the line using the geometry and material
        line = new THREE.Line(geometry, material);
        reference_plane.add(line);  // Add the cube mesh

        // Add the line to the scene
    }
    return reference_plane;
}

function create_reference_arrows() {
    let ref_arrow = new THREE.Group();
    const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 5, 0xff0000);
    ref_arrow.add(arrowX);
    const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 5, 0x00ff00);
    ref_arrow.add(arrowY);
    const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 5, 0x0000FF);
    ref_arrow.add(arrowZ);
    return ref_arrow;
}

function create_curve() {

    // points of the surface
    const min_price = env.get_simul_min_price_of_combo();
    const max_price = env.get_simul_max_price_of_combo();

    //const min_price = 210;
    //const max_price = 230;
    const step_price = 2;
    const min_time = 0;
    const max_time = 15;
    const step_time = 2;
    const priceRange = d3.range(min_price, max_price + 1e-5, step_price); // x-axis (Price)
    const timeRange = d3.range(min_time, max_time + 1e-5, step_time);   // y-axis (Time)
    //console.log("priceRange", priceRange);
    let price_to_xscale = d3.scaleLinear()
        .domain([min_price, max_price])
        .range([-ref_plane_half_size, ref_plane_half_size]);
    let time_to_yscale = d3.scaleLinear()
        .domain([min_time, max_time])
        .range([-ref_plane_half_size, ref_plane_half_size]);

    const matrixData = [];
    let count = 0;
    priceRange.forEach((price, i) => {
        const real_price = price;
        const x = price_to_xscale(real_price);
        //console.log(real_price,x);
        timeRange.forEach((time, j) => {
            let real_time = time;
            // Convert price and time to x and y coordinates
            const y = time_to_yscale(real_time);
            let z = compute_p_and_l_data_for_price(false, real_time, real_price);
            //let z=real_price>=225? 0.:2.;
            //console.log("price", price, "time", time, "output", z.y);
            matrixData.push({
                x: x,
                y: y,
                z: z.y / 30 / cameraPosition.z_zoom_factor
            });
            //console.log(price,time,x,y);//, z.y);
            count++;
        });
    });
    return [priceRange, timeRange, matrixData];
}
function create_mesh(curve_data) {

    let priceRange = curve_data[0];
    let timeRange = curve_data[1];
    let matrixData = curve_data[2];

    // Create a geometry for the plane
    const plane_width = ref_plane_half_size * 2;
    const plane_height = ref_plane_half_size * 2;
    const widthSeg = priceRange.length;
    const heightSeg = timeRange.length;
    const geometry = new THREE.PlaneGeometry(plane_width, plane_height, heightSeg - 1, widthSeg - 1);
    //console.log("widthSeg", widthSeg, "heightSeg", heightSeg);

    // Modify geometry vertices correctly
    const positions = geometry.attributes.position.array;
    let k = 0;
    for (let i = 0; i < widthSeg; i++) {
        for (let j = 0; j < heightSeg; j++) {
            positions[k + 2] = matrixData[i * heightSeg + j].z; // Set Z value
            k += 3;
        }
    }

    geometry.attributes.position.needsUpdate = true;

    // Create white material
    const materialSurface = new THREE.MeshStandardMaterial({
        color: 0x0000FF,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    const materialWireframe = new THREE.LineBasicMaterial({ color: 0xffffff }); // Black wireframe
    const mesh = new THREE.Mesh(geometry, materialSurface);
    const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), materialWireframe);

    return [mesh, wireframe];
}
function activate_3d() {
    update_3d_view();
}
window.activate_3d = activate_3d;
let animationFrameId = -1;

export function update_3d_view() {

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(cameraPosition.fov, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.up.set(0, 0, 1);          // Make Z the "up" direction
    camera.position.set(100, 100, 1);  // Camera at (10,10,1)
    camera.lookAt(0, 0, 0);          // Looking at (0,0,0)

    const view_container = d3.select("#camera-view")
    view_container.selectAll("*").remove();
    let tab_is_hidden = view_container.classed("hidden")
    view_container.classed("hidden", false);
    const width = view_container.node().clientWidth;
    const height = view_container.node().clientHeight;
    view_container.classed("hidden", tab_is_hidden);

    if (!renderer) {
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(width, height);
    }
    document.getElementById('camera-view').appendChild(renderer.domElement);


    // create the reference plane XY
    let reference_plane = create_reference_plane();
    scene.add(reference_plane);

    // create the 3 arrows referencial axes X,Y,Z
    let ref_arrow = create_reference_arrows();
    scene.add(ref_arrow);

    let curve_data = create_curve();
    let mesh_data = create_mesh(curve_data);

    scene.add(mesh_data[0]); // mesh surface
    scene.add(mesh_data[1]); // mesh wireframe


    // Add light for better visibility
    const light1 = new THREE.DirectionalLight(0xffffff, 1);
    light1.position.set(0, 10, 5);
    scene.add(light1);
    const light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set(10, 0, 5);
    scene.add(light2);


    function animate() {

        reference_plane.rotation.z = cameraPosition.z_rotation;
        mesh_data[0].rotation.z = cameraPosition.z_rotation;
        mesh_data[1].rotation.z = cameraPosition.z_rotation;

        ref_arrow.rotation.z = cameraPosition.z_rotation;
        animationFrameId = requestAnimationFrame(animate);
        camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);  // Camera at (10,10,1)
        renderer.render(scene, camera);
        const view_container = d3.select("#camera-view")
        let tab_is_hidden = view_container.classed("hidden")
        if (tab_is_hidden) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = -1;
            return;
        }
    }
    animate();




}
