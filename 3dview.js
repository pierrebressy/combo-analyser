import { compute_p_and_l_data_for_price, compute_greeks_data_for_price, env } from './script.js';

export let renderer;
export let x_camera = 20;
export let y_camera = 20;
export let z_camera = 5;

export let cameraPosition = {
    x: 17,
    y: 17,
    z: 1,
    fov: 40,
    z_rotation: 50,
    z_zoom_factor: 1,
};
const ref_plane_half_size = 5;
window.activate_3d = activate_3d;
let animationFrameId = -1;

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
        console.log("cameraPosition.z_zoom_factor", cameraPosition.z_zoom_factor);
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
    ref_arrow.add(arrowX);
    const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 5, 0x00ff00);
    ref_arrow.add(arrowY);
    const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 5, 0x0000FF);
    ref_arrow.add(arrowZ);
    ref_arrow.position.z += z;
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



    const black_material = new THREE.LineBasicMaterial({ color: 0x000000 });
    const green_material = new THREE.LineBasicMaterial({ color: 0x008000 });
    const orange_material = new THREE.LineBasicMaterial({ color: 0xFFA500 });
    let line_count = 0;
    const num_points = Math.round(env.get_pl_at_exp_data().length / 50);
    for (let i = 0; i < env.get_pl_at_exp_data().length - num_points; i += num_points) {
        line_count++;
        let x = time_to_xscale(0);
        const y1 = price_to_yscale(env.get_pl_at_exp_data()[i].x);
        const y2 = price_to_yscale(env.get_pl_at_exp_data()[i + num_points].x);
        let z1 = env.get_pl_at_exp_data()[i].y * cameraPosition.z_zoom_factor;
        let z2 = env.get_pl_at_exp_data()[i + num_points].y * cameraPosition.z_zoom_factor;
        let p2 = new THREE.Vector3(x, y1, zscale(z1))
        let p1 = new THREE.Vector3(x, y2, zscale(z2))
        let geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        let line = new THREE.Line(geometry, black_material);
        lines.add(line);

        x = time_to_xscale(env.get_time_for_simulation_of_combo());
        z1 = env.get_pl_at_sim_data()[i].y * cameraPosition.z_zoom_factor;
        z2 = env.get_pl_at_sim_data()[i + num_points].y * cameraPosition.z_zoom_factor;

        p1 = new THREE.Vector3(x, y1, zscale(z1))
        p2 = new THREE.Vector3(x, y2, zscale(z2))
        geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        line = new THREE.Line(geometry, green_material);
        lines.add(line);

        x = time_to_xscale(env.get_time_to_expiry_of_combo());
        z1 = env.get_pl_at_init_data()[i].y * cameraPosition.z_zoom_factor;
        z2 = env.get_pl_at_init_data()[i + num_points].y * cameraPosition.z_zoom_factor;

        p1 = new THREE.Vector3(x, y1, zscale(z1))
        p2 = new THREE.Vector3(x, y2, zscale(z2))
        geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        line = new THREE.Line(geometry, orange_material);
        lines.add(line);

    }
    //console.log("line_count=", line_count);



    return lines;
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
            positions[k + 0] = matrixData[i * heightSeg + j].y;
            positions[k + 1] = matrixData[i * heightSeg + j].x;
            positions[k + 2] = matrixData[i * heightSeg + j].z;
            k += 3;
        }
    }

    geometry.attributes.position.needsUpdate = true;

    // Create white material
    const materialSurface = new THREE.MeshStandardMaterial({
        color: 0x0000FF,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.1
    });
    const materialWireframe = new THREE.LineBasicMaterial({ color: 0xFFFFf0 }); // Black wireframe
    const mesh = new THREE.Mesh(geometry, materialSurface);
    const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), materialWireframe);

    return [mesh, wireframe];
}
function activate_3d() {
    update_3d_view();
}
export function update_3d_view() {

    const display_reference_plane = true;
    const display_reference_arrows = true;
    const display_curve = true;
    let display_specific_lines = false;
    let curve_data;
    let zero_point;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffee);
    const camera = new THREE.PerspectiveCamera(cameraPosition.fov, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.up.set(0, 0, 1);          // Make Z the "up" direction
    camera.position.set(100, 100, 1);  // Camera at (10,10,1)
    camera.lookAt(0, 0, 0);          // Looking at (0,0,0)

    const view_container = d3.select("#view-3d-container")
    view_container.selectAll("*").remove();
    //let tab_is_hidden = view_container.classed("hidden")
    view_container.classed("hidden", false);
    const width = view_container.node().clientWidth;
    const height = view_container.node().clientHeight;
    //view_container.classed("hidden", tab_is_hidden);
    //console.log("3dview=",env.get_3d_view());
    if(env.get_3d_view() == "P/L")
        [curve_data, zero_point] = create_pl_vs_time_and_price_surface();
    else if(env.get_3d_view() == "Delta")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(1);
    else if(env.get_3d_view() == "Gamma")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(2);
    else if(env.get_3d_view() == "Theta")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(3);
    else if(env.get_3d_view() == "Vega")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(4);
    else if(env.get_3d_view() == "Rho")
        [curve_data, zero_point] = create_greek_vs_time_and_price_surface(5);
    else {
        console.log("Error: "+env.get_3d_view()+" not found");
        return;
    }
    display_specific_lines = env.get_3d_view() == "P/L" ? display_specific_lines : false;
    if (!renderer) {
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(width, height);
    }
    document.getElementById('view-3d-container').appendChild(renderer.domElement);


    // create the reference plane XY
    let reference_plane = create_reference_plane(zero_point.z);
    if (display_reference_plane)
        scene.add(reference_plane);

    // create the 3 arrows referencial axes X,Y,Z
    let ref_arrow = create_reference_arrows(-5);
    if (display_reference_arrows)
        scene.add(ref_arrow);


    let mesh_data = create_mesh(curve_data);
    if (display_curve) {
        scene.add(mesh_data[0]); // mesh surface
        scene.add(mesh_data[1]); // mesh wireframe
    }

    // Add light for better visibility
    const light1 = new THREE.DirectionalLight(0xffffff, 1);
    light1.position.set(0, 10, 5);
    scene.add(light1);
    const light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set(10, 0, 5);
    scene.add(light2);

    const lines = create_specific_lines()
    if (display_specific_lines)
        scene.add(lines);

    /*
        const black_material = new THREE.LineBasicMaterial({ color: 0xFF00FF });
        const p1 = new THREE.Vector3(0, 0, 0)
        const p2 = new THREE.Vector3(5, 5, 0)
        const geometry = new THREE.BufferGeometry().setFromPoints([p1, p2]);
        const line = new THREE.Line(geometry, black_material);
        scene.add(line);
    */


        const pivot_1 = new THREE.Object3D();
        scene.add(pivot_1);        
        const canvas_1 = document.createElement('canvas');
        canvas_1.width = 256;
        canvas_1.height = 64;
        const ctx_1 = canvas_1.getContext('2d');
        ctx_1.font = '48px Arial';
        ctx_1.fillStyle = 'green';
        ctx_1.fillText('Price', canvas_1.width/2, 32);
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
        ctx_2.fillText('Days', canvas_2.width/2, 32);
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
        ctx_3.fillText(env.get_3d_view(), canvas_3.width/2, 32);
        const texture_3 = new THREE.CanvasTexture(canvas_3);
        const material_3 = new THREE.SpriteMaterial({ map: texture_3, transparent: true });
        const sprite_3 = new THREE.Sprite(material_3);
        sprite_3.scale.set(2, .5, 1); // Adjust as needed
        sprite_3.position.set(0, 0, 1); // Offset from center (so it orbits)
        pivot_3.add(sprite_3);
                








    function animate() {
        const z_angle = cameraPosition.z_rotation / 180 * Math.PI;
        pivot_1.rotation.z =z_angle;
        pivot_2.rotation.z =z_angle;
        //        line.rotation.z = cameraPosition.z_rotation;
        if (display_reference_plane)
            reference_plane.rotation.z = z_angle;
        if (display_reference_arrows)
            ref_arrow.rotation.z = z_angle;
        if (display_curve) {
            mesh_data[0].rotation.z = z_angle;
            mesh_data[1].rotation.z = z_angle;
        }
        if (display_specific_lines)
            lines.rotation.z = z_angle;
        animationFrameId = requestAnimationFrame(animate);
        camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);  // Camera at (10,10,1)
        renderer.render(scene, camera);
        const view_container = d3.select("#view-3d-container")
        let tab_is_hidden = view_container.classed("hidden")
        if (tab_is_hidden) {
            cancelAnimationFrame(animationFrameId);
            console.log("cancelAnimationFrame");
            
            animationFrameId = -1;
            return;
        }
    }
    animate();




}
