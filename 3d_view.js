import { compute_p_and_l_data_for_price, compute_data_to_display, compute_greeks_data_for_price } from './2d_graph.js';
import { get_dark_mode } from './global.js';
import { get_show_hplane } from './global.js';
import { get_show_3dbox } from './global.js';
import { global_data } from './main_script.js';
import { onGraphContainerVisible } from './frame.js';

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
    view_angle: 10
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

        const absMax = Math.max(Math.abs(this.min_data), Math.abs(this.max_data));
        this.zscale = d3.scaleLinear()
            .domain([-absMax, absMax])
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
                let z = compute_greeks_data_for_price(greek_index, use_legs_volatility, x);
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

                let z = compute_p_and_l_data_for_price(false, y, x);

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
    const plane_color = getComputedStyle(document.body).getPropertyValue("--ref-plane-color").trim();
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
function create_pl_vs_time_and_price_surface() {
    let surface = new PLSurface();
    compute_data_to_display();
    surface.set_x_limits(global_data.get_simul_min_price_of_combo(), global_data.get_simul_max_price_of_combo(), 20);
    surface.set_y_limits(0, global_data.get_time_to_expiry_of_active_combo(), 20);
    surface.prepare_dataset([global_data.get_pl_at_init_data(), global_data.get_pl_at_sim_data(), global_data.get_pl_at_exp_data()]);
    return [surface.run(), surface.get_zero_point()];
}
function create_greek_vs_time_and_price_surface(greek_index) {
    let surface = new GreekSurface();
    surface.set_x_limits(global_data.get_simul_min_price_of_combo(), global_data.get_simul_max_price_of_combo(), 20);
    surface.set_y_limits(0, global_data.get_time_to_expiry_of_active_combo(), 20);
    surface.prepare_dataset([global_data.get_greeks_data()[greek_index]]);
    return [surface.run(greek_index), surface.get_zero_point()];
}
function create_specific_lines() {

    let lines = new THREE.Group();

    const min_price = global_data.get_simul_min_price_of_combo();
    const max_price = global_data.get_simul_max_price_of_combo();
    const min_p_and_l = global_data.get_min_of_dataset();
    const max_p_and_l = global_data.get_max_of_dataset();
    const min_time = 0;
    const max_time = global_data.get_time_to_expiry_of_active_combo();
    let time_to_xscale = d3.scaleLinear()
        .domain([max_time, min_time])
        .range([-ref_plane_half_size, ref_plane_half_size]);
    let price_to_yscale = d3.scaleLinear()
        .domain([min_price, max_price])
        .range([-ref_plane_half_size, ref_plane_half_size]);

    const absMax = Math.max(Math.abs(min_p_and_l), Math.abs(max_p_and_l));
    let zscale = d3.scaleLinear()
        .domain([-absMax, absMax])
        .range([-ref_plane_half_size, ref_plane_half_size]);




    const green_points = [];
    const black_points = [];
    const orange_points = [];
    let line_count = 0;
    const num_points = Math.round(global_data.get_pl_at_exp_data().length / 50);
    let x = time_to_xscale(0);
    const y2 = price_to_yscale(global_data.get_pl_at_exp_data()[0].x);
    let z2 = global_data.get_pl_at_exp_data()[0].y * cameraPosition.z_zoom_factor;
    black_points.push(new THREE.Vector3(x, y2, zscale(z2)));
    x = time_to_xscale(global_data.get_time_for_simulation_of_active_combo());
    z2 = global_data.get_pl_at_sim_data()[0].y * cameraPosition.z_zoom_factor;
    green_points.push(new THREE.Vector3(x, y2, zscale(z2)));
    x = time_to_xscale(global_data.get_time_to_expiry_of_active_combo());
    z2 = global_data.get_pl_at_init_data()[0].y * cameraPosition.z_zoom_factor;
    orange_points.push(new THREE.Vector3(x, y2, zscale(z2)));

    for (let i = 0; i < global_data.get_pl_at_exp_data().length - num_points; i += num_points) {
        line_count++;
        let x = time_to_xscale(0);
        const y2 = price_to_yscale(global_data.get_pl_at_exp_data()[i + num_points].x);
        let z2 = global_data.get_pl_at_exp_data()[i + num_points].y * cameraPosition.z_zoom_factor;
        black_points.push(new THREE.Vector3(x, y2, zscale(z2)));

        x = time_to_xscale(global_data.get_time_for_simulation_of_active_combo());
        z2 = global_data.get_pl_at_sim_data()[i + num_points].y * cameraPosition.z_zoom_factor;
        green_points.push(new THREE.Vector3(x, y2, zscale(z2)));

        x = time_to_xscale(global_data.get_time_to_expiry_of_active_combo());
        z2 = global_data.get_pl_at_init_data()[i + num_points].y * cameraPosition.z_zoom_factor;
        orange_points.push(new THREE.Vector3(x, y2, zscale(z2)));

    }

    const black_material_color = getComputedStyle(document.body).getPropertyValue("--black-material-color").trim();
    const black_geometry = new THREE.BufferGeometry().setFromPoints(black_points);
    const black_line = new MeshLine();
    black_line.setGeometry(black_geometry);
    const black_material = new MeshLineMaterial({
        color: new THREE.Color(black_material_color),
        lineWidth: 0.1, // real visible width!
        transparent: true,
        depthTest: false
    });
    const black_mesh_line = new THREE.Mesh(black_line, black_material);
    lines.add(black_mesh_line);


    const green_material_color = getComputedStyle(document.body).getPropertyValue("--green-material-color").trim();
    const green_geometry = new THREE.BufferGeometry().setFromPoints(green_points);
    const green_line = new MeshLine();
    green_line.setGeometry(green_geometry);
    const green_material = new MeshLineMaterial({
        color: new THREE.Color(green_material_color),
        lineWidth: 0.1, // real visible width!
        transparent: true,
        depthTest: false
    });
    const green_mesh_line = new THREE.Mesh(green_line, green_material);
    lines.add(green_mesh_line);


    const orange_material_color = getComputedStyle(document.body).getPropertyValue("--orange-material-color").trim();
    const orange_geometry = new THREE.BufferGeometry().setFromPoints(orange_points);
    const orange_line = new MeshLine();
    orange_line.setGeometry(orange_geometry);
    const orange_material = new MeshLineMaterial({
        color: new THREE.Color(orange_material_color),
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

    const zAbsMax = Math.max(Math.abs(zMin), Math.abs(zMax));


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
            // Diverging color map: red (neg) - orange (zero) - green (pos)
            const zNorm = point.z / zAbsMax; // range [-1, 1]

            let hue;
            if (zNorm < 0) {
                // From red (0) to orange (0.08)
                hue = 0.08 * (1 + zNorm); // zNorm = -1 → 0 (red), zNorm = 0 → 0.08 (orange)
            } else {
                // From orange (0.08) to green (0.33)
                hue = 0.08 + (0.33 - 0.08) * zNorm; // zNorm = 0 → 0.08, zNorm = 1 → 0.33
            }

            color.setHSL(hue, 1.0, 0.5);



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

    const black_material_color = getComputedStyle(document.body).getPropertyValue("--black-material-color").trim();
    const materialWireframe = new THREE.LineBasicMaterial({ color: black_material_color }); // black wireframe
    const mesh = new THREE.Mesh(geometry, materialSurface);
    const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), materialWireframe);
    return [mesh, wireframe];
}
function activate_3d() {
    update_3d_view();
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
function draw_x_axis_arrow(scene) {
    const r = 0.1;
    const ref_plane_half_size = 10;
    const height = 2 * ref_plane_half_size;

    const material_color = getComputedStyle(document.body).getPropertyValue("--xaxis-material-color").trim();
    const geometry = new THREE.CylinderGeometry(r, r, height, 32);
    const material = new THREE.MeshStandardMaterial({ color: material_color });
    const cylinder = new THREE.Mesh(geometry, material);

    // Position: center between (-size, y, z) and (+size, y, z)
    cylinder.position.set(
        0,                         // midpoint on X
        -ref_plane_half_size,
        -ref_plane_half_size
    );

    // Rotate to align with X axis (Y → X => rotate Z axis)
    cylinder.rotation.z = Math.PI / 2;

    scene.add(cylinder);
}
function draw_y_axis_arrow(scene) {
    const r = 0.1;
    const ref_plane_half_size = 10;
    const height = 2 * ref_plane_half_size;

    const material_color = getComputedStyle(document.body).getPropertyValue("--yaxis-material-color").trim();
    const geometry = new THREE.CylinderGeometry(r, r, height, 32);
    const material = new THREE.MeshStandardMaterial({ color: material_color });
    const cylinder = new THREE.Mesh(geometry, material);

    // Position: center along Y axis, between -size and +size
    cylinder.position.set(
        -ref_plane_half_size,
        0, // midpoint on Y
        -ref_plane_half_size
    );

    // No rotation needed for Y
    scene.add(cylinder);
}
function draw_z_axis_arrow(scene) {
    // Parameters
    const r = 0.1;                         // Cylinder radius
    const ref_plane_half_size = 10;      // Reference size
    const height = 2 * ref_plane_half_size;

    // Create cylinder geometry (oriented along Y by default)
    const geometry = new THREE.CylinderGeometry(r, r, height, 32);

    // Create material (any style you like)
    const material_color = getComputedStyle(document.body).getPropertyValue("--zaxis-material-color").trim();
    const material = new THREE.MeshStandardMaterial({ color: material_color });

    // Create mesh
    const cylinder = new THREE.Mesh(geometry, material);

    // Position: center along the Z axis, match the midpoint of the range
    cylinder.position.set(
        -ref_plane_half_size,
        -ref_plane_half_size,
        0 // middle of -size to +size
    );

    // Rotate to align with Z axis (default is Y)
    cylinder.rotation.x = Math.PI / 2;  // Rotate 90° around X

    // Add to scene
    scene.add(cylinder);
}
function draw_axis_arrows(scene) {
    draw_x_axis_arrow(scene);
    draw_y_axis_arrow(scene);
    draw_z_axis_arrow(scene);
}
export function update_3d_view() {

    const display_reference_plane = get_show_hplane();
    const display_reference_arrows = get_show_hplane();
    const display_curve = true;
    let display_specific_lines = true;
    let curve_data;
    let zero_point;

    cleanupThree();

    let width = 0;
    let height = 0;
    onGraphContainerVisible();
    width = global_data.get_window_width()
    height = global_data.get_window_height()
    //console.log("update_3d_view:  Width:", width);
    //console.log("update_3d_view:  Height:", height);

    let container = document.getElementById('view3d-container');


    // Create a canvas renderer and attach it to the container
    scene = new THREE.Scene();

    const material_color = getComputedStyle(document.body).getPropertyValue("--bg-main").trim();
    scene.background = new THREE.Color(material_color);
    camera = new THREE.PerspectiveCamera(cameraPosition.fov, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.up.set(0, 0, 1);          // Make Z the "up" direction


    let theta = cameraPosition.z_rotation / 180.0 * Math.PI;
    let alpha = cameraPosition.view_angle / 180.0 * Math.PI;
    cameraPosition.x = cameraPosition.dist * Math.cos(theta) * Math.cos(alpha);
    cameraPosition.y = cameraPosition.dist * Math.sin(theta) * Math.cos(alpha);
    cameraPosition.z = cameraPosition.dist * Math.sin(alpha);

    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);  // Camera at (10,10,1)
    camera.lookAt(0, 0, 0);          // Looking at (0,0,0)

    if (global_data.get_3d_view() == "P/L")
        [curve_data, zero_point] = create_pl_vs_time_and_price_surface();
    else if (global_data.get_3d_view() == "Delta")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(1);
    else if (global_data.get_3d_view() == "Gamma")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(2);
    else if (global_data.get_3d_view() == "Theta")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(3);
    else if (global_data.get_3d_view() == "Vega")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(4);
    else if (global_data.get_3d_view() == "Rho")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(5);
    else {
        console.log("Error: " + global_data.get_3d_view() + " not found");
        return;
    }
    //console.log(zero_point)
    //console.log(curve_data)
    display_specific_lines = global_data.get_3d_view() == "P/L" ? display_specific_lines : false;

    // create the reference plane XY
    let reference_plane = create_reference_plane(zero_point.z);
    if (display_reference_plane)
        scene.add(reference_plane);

    // create the reference plane XY
    let box3d = create_3dbox(zero_point.z);
    if (get_show_3dbox())
        scene.add(box3d);

    // create the 3 arrows referencial axes X,Y,Z
    if (display_reference_arrows)
        draw_axis_arrows(scene);

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
        ctx_1.fillStyle = '#00ff00';
        ctx_1.fillText('Price', canvas_1.width / 2, 40);
        const texture_1 = new THREE.CanvasTexture(canvas_1);
        const material_1 = new THREE.SpriteMaterial({ map: texture_1, transparent: true });
        const sprite_1 = new THREE.Sprite(material_1);
        sprite_1.scale.set(4, 1.5, 2); // Adjust as needed
        sprite_1.position.set(-ref_plane_half_size, ref_plane_half_size, -ref_plane_half_size); // Offset from center (so it orbits)
        pivot_1.add(sprite_1);

        const pivot_2 = new THREE.Object3D();
        scene.add(pivot_2);
        const canvas_2 = document.createElement('canvas');
        canvas_2.width = 256;
        canvas_2.height = 64;
        const ctx_2 = canvas_2.getContext('2d');
        ctx_2.font = '48px Arial';
        ctx_2.fillStyle = '#ff0000';
        ctx_2.fillText('Days', canvas_2.width / 2, 40);
        const texture_2 = new THREE.CanvasTexture(canvas_2);
        const material_2 = new THREE.SpriteMaterial({ map: texture_2, transparent: true });
        const sprite_2 = new THREE.Sprite(material_2);
        sprite_2.scale.set(4, 1.5, 2); // Adjust as needed
        sprite_2.position.set(ref_plane_half_size, -ref_plane_half_size, -ref_plane_half_size); // Offset from center (so it orbits)
        pivot_2.add(sprite_2);

        const pivot_3 = new THREE.Object3D();
        scene.add(pivot_3);
        const canvas_3 = document.createElement('canvas');
        canvas_3.width = 256;
        canvas_3.height = 64;
        const ctx_3 = canvas_3.getContext('2d');
        ctx_3.font = '48px Arial';
        ctx_3.fillStyle = '#add8e6';
        ctx_3.fillText(global_data.get_3d_view(), canvas_3.width / 2, 40);
        const texture_3 = new THREE.CanvasTexture(canvas_3);
        const material_3 = new THREE.SpriteMaterial({ map: texture_3, transparent: true });
        const sprite_3 = new THREE.Sprite(material_3);
        sprite_3.scale.set(4, 1.5, 1); // Adjust as needed
        sprite_3.position.set(-ref_plane_half_size, -ref_plane_half_size, ref_plane_half_size); // Offset from center (so it orbits)
        pivot_3.add(sprite_3);
    }

    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, zero_point.z), -zero_point.z); // z = 0
    const planeHelper = new THREE.PlaneHelper(planeZ, 2 * ref_plane_half_size, 0xadd8e6); // size, color (light blue)
    scene.add(planeHelper);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    container.appendChild(renderer.domElement);

    camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);

    renderer.render(scene, camera);
}
