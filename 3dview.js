import { compute_p_and_l_data_for_price, compute_greeks_data_for_price, env } from './main_script.js';
import { addLog } from './log.js';
import { dark_mode, show_hplane, show_3dbox, two_colors_cmap } from './main_script.js';

export let x_camera = 20;
export let y_camera = 20;
export let z_camera = 5;

export let cameraPosition = {
    x: 17,
    y: 17,
    dist: 50,
    z: 1.4,
    fov: 40,
    z_rotation: 30,
    z_zoom_factor: 0.7,
    view_angle: 30
};
const ref_plane_half_size = 10;
window.activate_3d = activate_3d;
let animationId = null;
let renderer = null;
let scene = null;
let camera = null;


class Generic3DSurface {
    constructor() {
        this.xdata = null;
        this.ydata = null;
        this.half_width = ref_plane_half_size;
    }
    set_x_limits(min_value, max_value, num_points) {
        this.x_min = min_value;
        this.x_max = max_value;
        this.num_x_points = num_points;
        this.x_step = (this.x_max - this.x_min) / this.num_x_points;
    }
    set_y_limits(min_value, max_value, num_points) {
        this.y_min = min_value;
        this.y_max = max_value;
        this.num_y_points = num_points;
        this.y_step = (this.y_max - this.y_min) / this.num_y_points;
    }
    prepare_dataset(dataset) {
        this.data = dataset;
        this.min_data = d3.min(this.data.flat(), d => d.y);
        this.max_data = d3.max(this.data.flat(), d => d.y);

        this.xscale = d3.scaleLinear()
            .domain([this.x_min, this.x_max])
            .range([-this.half_width, this.half_width]);
        this.yscale = d3.scaleLinear()
            .domain([this.y_min, this.y_max])
            .range([-this.half_width, this.half_width]);
        this.zscale = d3.scaleLinear()
            .domain([this.min_data, this.max_data])
            .range([-this.half_width, this.half_width]);

        this.xrange = d3.range(this.x_min, this.x_max + 1e-5, this.x_step);
        this.yrange = d3.range(this.y_min, this.y_max + 1e-5, this.y_step);
        this.matrixData = new Array(this.xrange.length * this.yrange.length);

    }
    get_zero_point() {
        return {
            x: this.xscale(0),
            y: this.yscale(0),
            z: this.zscale(0)
        };
    }
}

class GreekSurface extends Generic3DSurface {

    run(greek_index) {
        //console.log("cameraPosition.z_zoom_factor", cameraPosition.z_zoom_factor);
        let count = 0;
        this.xrange.forEach((x, i) => {
            this.yrange.forEach((y, j) => {

                const use_legs_volatility = false
                const get_use_real_values = false
                let z = compute_greeks_data_for_price(greek_index, use_legs_volatility, get_use_real_values, x);
                this.matrixData[count] = {
                    x: this.xscale(x),
                    y: this.yscale(y),
                    z: this.zscale(z.y * cameraPosition.z_zoom_factor)
                };

                count++;
            });
        });
        return [this.xrange, this.yrange, this.matrixData];
    }
}

class PLSurface extends Generic3DSurface {

    run() {
        let count = 0;
        this.xrange.forEach((x, i) => {
            this.yrange.forEach((y, j) => {

                let z = compute_p_and_l_data_for_price(true, y, x);

                this.matrixData[count] = {
                    x: this.xscale(x),
                    y: -this.yscale(y),
                    z: this.zscale(z.y * cameraPosition.z_zoom_factor)
                };

                count++;
            });
        });
        return [this.xrange, this.yrange, this.matrixData];
    }
}


function create_3dbox(z) {
    let reference_plane = new THREE.Group();
    let plane_color = 0x505050; // Gray color
    let points;
    let geometry;
    let material;
    let line;
    let z_offset = z - Math.floor(z);
    //console.log("z_offset", z_offset);
    for (let i = -ref_plane_half_size; i <= ref_plane_half_size; i += 1) {

        points = [
            new THREE.Vector3(ref_plane_half_size, -ref_plane_half_size, i + z_offset),  // Starting point
            new THREE.Vector3(-ref_plane_half_size, -ref_plane_half_size, i + z_offset),  // Starting point
            new THREE.Vector3(-ref_plane_half_size, ref_plane_half_size, i + z_offset),  // Starting point
        ];

        // Create a geometry for the line
        geometry = new THREE.BufferGeometry().setFromPoints(points);

        if (Math.abs((i + z_offset) - z) < 0.3)
            plane_color = 0xFFFFFF;
        else
            plane_color = 0x505050;
        // Create a material for the line (red)
        material = new THREE.LineBasicMaterial({ color: plane_color });
        plane_color = 0x505050;

        // Create the line using the geometry and material
        line = new THREE.Line(geometry, material);
        reference_plane.add(line);  // Add the cube mesh

        points = [
            new THREE.Vector3(-ref_plane_half_size, i, -ref_plane_half_size + z_offset),  // Starting point
            new THREE.Vector3(-ref_plane_half_size, i, ref_plane_half_size + z_offset),  // Starting point
        ];

        // Create a geometry for the line
        geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Create a material for the line (red)
        material = new THREE.LineBasicMaterial({ color: plane_color });

        // Create the line using the geometry and material
        line = new THREE.Line(geometry, material);
        reference_plane.add(line);  // Add the cube mesh

        points = [
            new THREE.Vector3(i, -ref_plane_half_size, -ref_plane_half_size + z_offset),  // Starting point
            new THREE.Vector3(i, -ref_plane_half_size, ref_plane_half_size + z_offset),  // Starting point
        ];

        // Create a geometry for the line
        geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Create a material for the line (red)
        material = new THREE.LineBasicMaterial({ color: plane_color });

        // Create the line using the geometry and material
        line = new THREE.Line(geometry, material);
        reference_plane.add(line);  // Add the cube mesh

    }
    return reference_plane;
}
function create_reference_plane(z) {
    let reference_plane = new THREE.Group();
    let plane_color = 0xa0a0a0; // Gray color
    let points;
    let geometry;
    let material;
    let line;

    for (let i = -ref_plane_half_size; i <= ref_plane_half_size; i += ref_plane_half_size) {

        points = [
            new THREE.Vector3(i, -ref_plane_half_size, z),  // Starting point
            new THREE.Vector3(i, ref_plane_half_size, z)   // Ending point
        ];

        // Create a geometry for the line
        geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Create a material for the line (red)
        material = new THREE.LineBasicMaterial({ color: plane_color });

        // Create the line using the geometry and material
        line = new THREE.Line(geometry, material);
        reference_plane.add(line);  // Add the cube mesh

        points = [
            new THREE.Vector3(-ref_plane_half_size, i, z),  // Starting point
            new THREE.Vector3(ref_plane_half_size, i, z)   // Ending point
        ];

        // Create a geometry for the line
        geometry = new THREE.BufferGeometry().setFromPoints(points);

        // Create a material for the line (red)
        material = new THREE.LineBasicMaterial({ color: plane_color });

        // Create the line using the geometry and material
        line = new THREE.Line(geometry, material);
        reference_plane.add(line);  // Add the cube mesh

        // Add the line to the scene
    }
    return reference_plane;
}
function create_reference_arrows(z) {
    let ref_arrow = new THREE.Group();
    const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 5, 0xff0000);
    arrowX.position.z += z;
    ref_arrow.add(arrowX);
    const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 5, 0x00ff00);
    arrowY.position.z += z;
    ref_arrow.add(arrowY);
    const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 5, 0x0000FF);
    arrowZ.position.z += z;
    ref_arrow.add(arrowZ);
    //ref_arrow.position.z += z;
    return ref_arrow;
}
function create_pl_vs_time_and_price_surface() {
    let surface = new PLSurface();
    surface.set_x_limits(env.get_simul_min_price_of_combo(), env.get_simul_max_price_of_combo(), 20);
    surface.set_y_limits(0, env.get_time_to_expiry_of_combo(), 20);
    surface.prepare_dataset([env.get_pl_at_init_data(), env.get_pl_at_sim_data(), env.get_pl_at_exp_data()]);
    return [surface.run(), surface.get_zero_point()];
}
function create_greek_vs_time_and_price_surface(greek_index) {
    let surface = new GreekSurface();
    surface.set_x_limits(env.get_simul_min_price_of_combo(), env.get_simul_max_price_of_combo(), 20);
    surface.set_y_limits(0, env.get_time_to_expiry_of_combo(), 20);
    surface.prepare_dataset([env.get_greeks_data()[greek_index]]);
    return [surface.run(greek_index), surface.get_zero_point()];
}
function create_specific_lines() {

    let lines = new THREE.Group();

    const min_price = env.get_simul_min_price_of_combo();
    const max_price = env.get_simul_max_price_of_combo();
    const min_p_and_l = env.get_min_of_dataset();
    const max_p_and_l = env.get_max_of_dataset();
    const min_time = 0;
    const max_time = env.get_time_to_expiry_of_combo();
    let time_to_xscale = d3.scaleLinear()
        .domain([max_time, min_time])
        .range([-ref_plane_half_size, ref_plane_half_size]);
    let price_to_yscale = d3.scaleLinear()
        .domain([min_price, max_price])
        .range([-ref_plane_half_size, ref_plane_half_size]);
    let zscale = d3.scaleLinear()
        .domain([min_p_and_l, max_p_and_l])
        .range([-ref_plane_half_size, ref_plane_half_size]);




    const green_points = [];
    const black_points = [];
    const orange_points = [];
    let line_count = 0;
    const num_points = Math.round(env.get_pl_at_exp_data().length / 50);
    let x = time_to_xscale(0);
    const y2 = price_to_yscale(env.get_pl_at_exp_data()[0].x);
    let z2 = env.get_pl_at_exp_data()[0].y * cameraPosition.z_zoom_factor;
    black_points.push(new THREE.Vector3(x, y2, zscale(z2)));
    x = time_to_xscale(env.get_time_for_simulation_of_combo());
    z2 = env.get_pl_at_sim_data()[0].y * cameraPosition.z_zoom_factor;
    green_points.push(new THREE.Vector3(x, y2, zscale(z2)));
    x = time_to_xscale(env.get_time_to_expiry_of_combo());
    z2 = env.get_pl_at_init_data()[0].y * cameraPosition.z_zoom_factor;
    orange_points.push(new THREE.Vector3(x, y2, zscale(z2)));

    for (let i = 0; i < env.get_pl_at_exp_data().length - num_points; i += num_points) {
        line_count++;
        let x = time_to_xscale(0);
        const y2 = price_to_yscale(env.get_pl_at_exp_data()[i + num_points].x);
        let z2 = env.get_pl_at_exp_data()[i + num_points].y * cameraPosition.z_zoom_factor;
        black_points.push(new THREE.Vector3(x, y2, zscale(z2)));

        x = time_to_xscale(env.get_time_for_simulation_of_combo());
        z2 = env.get_pl_at_sim_data()[i + num_points].y * cameraPosition.z_zoom_factor;
        green_points.push(new THREE.Vector3(x, y2, zscale(z2)));

        x = time_to_xscale(env.get_time_to_expiry_of_combo());
        z2 = env.get_pl_at_init_data()[i + num_points].y * cameraPosition.z_zoom_factor;
        orange_points.push(new THREE.Vector3(x, y2, zscale(z2)));

    }

    const black_geometry = new THREE.BufferGeometry().setFromPoints(black_points);
    const black_line = new MeshLine();
    black_line.setGeometry(black_geometry);
    const black_material = new MeshLineMaterial({
        color: new THREE.Color(dark_mode ? 0xffffff : 0x000000),
        lineWidth: 0.1, // real visible width!
        transparent: true,
        depthTest: false
    });
    const black_mesh_line = new THREE.Mesh(black_line, black_material);
    lines.add(black_mesh_line);


    const green_geometry = new THREE.BufferGeometry().setFromPoints(green_points);
    const green_line = new MeshLine();
    green_line.setGeometry(green_geometry);
    const green_material = new MeshLineMaterial({
        color: new THREE.Color(0x008000),
        lineWidth: 0.1, // real visible width!
        transparent: true,
        depthTest: false
    });
    const green_mesh_line = new THREE.Mesh(green_line, green_material);
    lines.add(green_mesh_line);


    const orange_geometry = new THREE.BufferGeometry().setFromPoints(orange_points);
    const orange_line = new MeshLine();
    orange_line.setGeometry(orange_geometry);
    const orange_material = new MeshLineMaterial({
        color: new THREE.Color(0xFFA500),
        lineWidth: 0.1, // real visible width!
        transparent: true,
        depthTest: false
    });
    const orange_mesh_line = new THREE.Mesh(orange_line, orange_material);
    lines.add(orange_mesh_line);

    return lines;
}
function create_mesh_color_heatmap(curve_data, z) {

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
    const colorArray = new Float32Array((widthSeg) * (heightSeg) * 3);

    // Find Z min and max for normalization
    const zValues = matrixData.map(p => p.z);
    const zMin = Math.min(...zValues);
    const zMax = Math.max(...zValues);
    let k = 0;
    for (let i = 0; i < widthSeg; i++) {
        for (let j = 0; j < heightSeg; j++) {
            const index = i * heightSeg + j;
            const point = matrixData[index];

            // Set position (X = y, Y = x, Z = z)
            positions[k + 0] = point.y;
            positions[k + 1] = point.x;
            positions[k + 2] = point.z;

            // Normalize Z and convert to color
            const color = new THREE.Color();
            if (two_colors_cmap) {
                const zNorm = (point.z - zMin) / (zMax - zMin); // [0, 1]
                color.setHSL((zNorm) * 0.33, 1.0, 0.5); // green (0.33) → red (0)
            }
            else {
                const zNorm = (point.z - zMin) / (zMax - zMin); // [0, 1]
                color.setHSL((1 - zNorm) * 0.7, 1.0, 0.5); // 0.7 (blue) → 0 (red)    
            }

            colorArray[k + 0] = color.r;
            colorArray[k + 1] = color.g;
            colorArray[k + 2] = color.b;

            k += 3;
        }
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
    geometry.attributes.position.needsUpdate = true;

    // Material using vertex colors
    const materialSurface = new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 1
    });

    const materialWireframe = new THREE.LineBasicMaterial({ color: 0x000000 }); // black wireframe
    const mesh = new THREE.Mesh(geometry, materialSurface);
    const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), materialWireframe);
    return [mesh, wireframe];
}
function activate_3d() {
    update_3d_view();
}
export function UNUSED_update_3d_view_ref() {
    const view_container = d3.select("#view3d-graph-container")
    view_container.selectAll("*").remove();

    const container = document.getElementById('view3d-graph-container');

    // Create a canvas renderer and attach it to the container
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Create a cube
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshNormalMaterial(); // colorful shading
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    camera.position.z = 2;

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    }

    animate();

}
function cleanupThree() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }

    //    window.removeEventListener('resize', onWindowResize);

    if (scene) {
        scene.traverse((obj) => {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) {
                    obj.material.forEach(mat => mat.dispose());
                } else {
                    obj.material.dispose();
                }
            }
        });
    }

    if (renderer) {
        renderer.dispose();
        renderer.forceContextLoss()
        if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
        }
        renderer = null;
    }

    scene = null;
    camera = null;
}


export function update_3d_view() {
    const display_reference_plane = show_hplane;
    const display_reference_arrows = show_hplane;
    const display_curve = true;
    let display_specific_lines = true;
    let curve_data;
    let zero_point;

    cleanupThree();

    const container = document.getElementById('view3d-graph-container');
    // Create a canvas renderer and attach it to the container
    scene = new THREE.Scene();

    scene.background = new THREE.Color(dark_mode ? '#1e1e1e' : '#ffffee');
    camera = new THREE.PerspectiveCamera(cameraPosition.fov, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.up.set(0, 0, 1);          // Make Z the "up" direction

    let theta = cameraPosition.z_rotation / 180.0 * Math.PI;
    let alpha = cameraPosition.view_angle / 180.0 * Math.PI;
    cameraPosition.x = cameraPosition.dist * Math.cos(theta) * Math.cos(alpha);
    cameraPosition.y = cameraPosition.dist * Math.sin(theta) * Math.cos(alpha);
    cameraPosition.z = cameraPosition.dist * Math.sin(alpha);

    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);  // Camera at (10,10,1)
    camera.lookAt(0, 0, 0);          // Looking at (0,0,0)

    if (env.get_3d_view() == "P/L")
        [curve_data, zero_point] = create_pl_vs_time_and_price_surface();
    else if (env.get_3d_view() == "Delta")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(1);
    else if (env.get_3d_view() == "Gamma")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(2);
    else if (env.get_3d_view() == "Theta")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(3);
    else if (env.get_3d_view() == "Vega")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(4);
    else if (env.get_3d_view() == "Rho")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(5);
    else {
        console.log("Error: " + env.get_3d_view() + " not found");
        return;
    }
    //console.log(zero_point)
    //console.log(curve_data)
    display_specific_lines = env.get_3d_view() == "P/L" ? display_specific_lines : false;

    // create the reference plane XY
    let reference_plane = create_reference_plane(zero_point.z);
    if (display_reference_plane)
        scene.add(reference_plane);

    // create the reference plane XY
    let box3d = create_3dbox(zero_point.z);
    if (show_3dbox)
        scene.add(box3d);

    // create the 3 arrows referencial axes X,Y,Z
    let ref_arrow = create_reference_arrows(zero_point.z);
    if (display_reference_arrows)
        scene.add(ref_arrow);



    let mesh_data = create_mesh_color_heatmap(curve_data, zero_point.z);
    if (display_curve) {
        scene.add(mesh_data[0]); // mesh surface
        //scene.add(mesh_data[1]); // mesh wireframe
    }

    const omniLight = new THREE.AmbientLight(0xffffff);
    omniLight.position.set(0, 0, 20); // Position it in the scene
    scene.add(omniLight);

    const lines = create_specific_lines()
    if (display_specific_lines)
        scene.add(lines);

    if (display_reference_arrows) {

        const pivot_1 = new THREE.Object3D();
        scene.add(pivot_1);
        const canvas_1 = document.createElement('canvas');
        canvas_1.width = 256;
        canvas_1.height = 64;
        const ctx_1 = canvas_1.getContext('2d');
        ctx_1.font = '48px Arial';
        ctx_1.fillStyle = 'green';
        ctx_1.fillText('Price', canvas_1.width / 2, 32);
        const texture_1 = new THREE.CanvasTexture(canvas_1);
        const material_1 = new THREE.SpriteMaterial({ map: texture_1, transparent: true });
        const sprite_1 = new THREE.Sprite(material_1);
        sprite_1.scale.set(2, .5, 1); // Adjust as needed
        sprite_1.position.set(0, 5, zero_point.z); // Offset from center (so it orbits)
        pivot_1.add(sprite_1);

        const pivot_2 = new THREE.Object3D();
        scene.add(pivot_2);
        const canvas_2 = document.createElement('canvas');
        canvas_2.width = 256;
        canvas_2.height = 64;
        const ctx_2 = canvas_2.getContext('2d');
        ctx_2.font = '48px Arial';
        ctx_2.fillStyle = 'red';
        ctx_2.fillText('Days', canvas_2.width / 2, 32);
        const texture_2 = new THREE.CanvasTexture(canvas_2);
        const material_2 = new THREE.SpriteMaterial({ map: texture_2, transparent: true });
        const sprite_2 = new THREE.Sprite(material_2);
        sprite_2.scale.set(2, .5, 1); // Adjust as needed
        sprite_2.position.set(5, 0, zero_point.z); // Offset from center (so it orbits)
        pivot_2.add(sprite_2);

        const pivot_3 = new THREE.Object3D();
        scene.add(pivot_3);
        const canvas_3 = document.createElement('canvas');
        canvas_3.width = 256;
        canvas_3.height = 64;
        const ctx_3 = canvas_3.getContext('2d');
        ctx_3.font = '48px Arial';
        ctx_3.fillStyle = 'blue';
        ctx_3.fillText(env.get_3d_view(), canvas_3.width / 2, 32);
        const texture_3 = new THREE.CanvasTexture(canvas_3);
        const material_3 = new THREE.SpriteMaterial({ map: texture_3, transparent: true });
        const sprite_3 = new THREE.Sprite(material_3);
        sprite_3.scale.set(2, .5, 1); // Adjust as needed
        sprite_3.position.set(0, 0, zero_point.z); // Offset from center (so it orbits)
        pivot_3.add(sprite_3);
    }


    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, zero_point.z), -zero_point.z); // z = 0
    const planeHelper = new THREE.PlaneHelper(planeZ, 2 * ref_plane_half_size, 0xadd8e6); // size, color (light blue)
    scene.add(planeHelper);






    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);




    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);

    renderer.render(scene, camera);


}
