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
    z_rotation: 0
};

export function update_3d_view() {

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(cameraPosition.fov, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.up.set(0, 0, 1);          // Make Z the "up" direction
    camera.position.set(100, 100, 1);  // Camera at (10,10,1)
    camera.lookAt(0, 0, 0);          // Looking at (0,0,0)

    const view_container = d3.select("#camera-view")
    view_container.selectAll("*").remove();
    const width = view_container.node().clientWidth;
    const height = view_container.node().clientHeight;
    if (!renderer) {
        renderer = new THREE.WebGLRenderer();
        //renderer.setSize(width, height);
        renderer.setSize(800, 800);
    }
    document.getElementById('camera-view').appendChild(renderer.domElement);


    // create the XY plane
    let reference_plane = new THREE.Group();
    let points;
    let geometry;
    let material;
    let line;

    const ref_plane_half_size = 5;
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
    scene.add(reference_plane);




    // create the 3 arrows referencial axes X,Y,Z
    let ref_arrow = new THREE.Group();
    if (1) {
        const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 5, 0xff0000);
        ref_arrow.add(arrowX);
        const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 5, 0x00ff00);
        ref_arrow.add(arrowY);
        const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 5, 0x0000FF);
        ref_arrow.add(arrowZ);

    }
    scene.add(ref_arrow);




    /*
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;

    const ctx = canvas.getContext('2d');
    function changeCanvas() {
       ctx.font = '10pt Arial'
       ctx.fillStyle = 'white'
       ctx.fillRect(0, 0, canvas.width, canvas.height)
       ctx.fillStyle = 'black'
       ctx.textAlign = 'center'
       ctx.textBaseline = 'middle'
       ctx.fillText('215', canvas.width / 2, canvas.height / 2)
    }
    const texture = new THREE.Texture(canvas)
    const materialt = new THREE.MeshStandardMaterial({ map: texture })
    const geometryt = new THREE.PlaneGeometry(5, 5); // Width and height of the plane
    const mesht = new THREE.Mesh(geometryt, materialt)
    mesht.position.set(0, 0, 0);
    mesht.rotation.x=-1.57;

    scene.add(mesht)
*/

    // points of the surface

    const min_price = 210;
    const max_price = 230;
    const step_price = 1;
    const min_time = 0;
    const max_time = 15;
    const step_time = 1;
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
                z: z.y / 30
            });
            //console.log(price,time,x,y);//, z.y);
            count++;
        });
    });
    console.log("count", count);

    // Create geometry
    const plane_width = ref_plane_half_size * 2;
    const plane_height = ref_plane_half_size * 2;
    const widthSeg = priceRange.length;
    const heightSeg = timeRange.length;
    const geometry2 = new THREE.PlaneGeometry(plane_width, plane_height, heightSeg - 1, widthSeg - 1);
    console.log("widthSeg", widthSeg, "heightSeg", heightSeg);

    // Modify geometry vertices correctly
    const positions = geometry2.attributes.position.array;
    let k = 0;
    for (let i = 0; i < widthSeg; i++) {
        for (let j = 0; j < heightSeg; j++) {
            positions[k + 2] = matrixData[i * heightSeg + j].z; // Set Z value
            k += 3;
        }
    }

    geometry2.attributes.position.needsUpdate = true;

    // Create white material
    //const material2 = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, flatShading: true });
    const materialSurface = new THREE.MeshStandardMaterial({
        color: 0x0000FF,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.5
    });
    const materialWireframe = new THREE.LineBasicMaterial({ color: 0xffffff }); // Black wireframe
    const mesh = new THREE.Mesh(geometry2, materialSurface);
    const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry2), materialWireframe);
    scene.add(mesh);
    scene.add(wireframe);

    //const plane = new THREE.Mesh(geometry2, materialSurface);
    //scene.add(plane);

    // Add light for better visibility
    const light1 = new THREE.DirectionalLight(0xffffff, 1);
    light1.position.set(0, 10, 5);
    scene.add(light1);
    const light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set(10, 0, 5);
    scene.add(light2);


    function animate() {

        reference_plane.rotation.z = cameraPosition.z_rotation;
        mesh.rotation.z = cameraPosition.z_rotation;
        wireframe.rotation.z = cameraPosition.z_rotation;

        ref_arrow.rotation.z = cameraPosition.z_rotation;
        requestAnimationFrame(animate);
        camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);  // Camera at (10,10,1)
        renderer.render(scene, camera);
    }
    animate();




}

export function update_3d_view_for_test() {

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.up.set(0, 0, 1);          // Make Z the "up" direction
    camera.position.set(100, 100, 1);  // Camera at (10,10,1)
    camera.lookAt(0, 0, 0);          // Looking at (0,0,0)

    const view_container = d3.select("#camera-view")
    view_container.selectAll("*").remove();
    const width = view_container.node().clientWidth;
    const height = view_container.node().clientHeight;
    if (!renderer) {
        renderer = new THREE.WebGLRenderer();
        renderer.setSize(1000, 800);
    }
    document.getElementById('camera-view').appendChild(renderer.domElement);



    const geometry = new THREE.BoxGeometry(4, 4, 4);
    const material = new THREE.MeshBasicMaterial({
        color: 0x00ff00,
        transparent: false,
        opacity: 0.5,  // 30% visible
        wireframe: false
    });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);

    const vertices = geometry.attributes.position.array;
    const vertexMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.05 }); // White small points
    const vertexGeometry = new THREE.BufferGeometry();
    vertexGeometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    const points = new THREE.Points(vertexGeometry, vertexMaterial);

    const edges = new THREE.EdgesGeometry(geometry); // Extracts only edges
    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0xffffff }); // White edges
    const lines = new THREE.LineSegments(edges, edgeMaterial);

    const mycube = new THREE.Group();
    mycube.add(cube);  // Add the cube mesh
    mycube.add(lines); // Add the lines (edges)
    mycube.add(points); // Add the points

    scene.add(mycube);



    let xy_plane = new THREE.Group();
    let points_l1;
    let geometry_l1;
    let material_l1;
    let line1;
    let line2;

    const vmax = 10;
    for (let i = -vmax; i <= vmax; i++) {

        points_l1 = [
            new THREE.Vector3(i, -vmax, 0),  // Starting point
            new THREE.Vector3(i, vmax, 0)   // Ending point
        ];

        // Create a geometry for the line
        geometry_l1 = new THREE.BufferGeometry().setFromPoints(points_l1);

        // Create a material for the line (red)
        material_l1 = new THREE.LineBasicMaterial({ color: 0xff0000 });

        // Create the line using the geometry and material
        line1 = new THREE.Line(geometry_l1, material_l1);
        xy_plane.add(line1);  // Add the cube mesh

        points_l1 = [
            new THREE.Vector3(-vmax, i, 0),  // Starting point
            new THREE.Vector3(vmax, i, 0)   // Ending point
        ];

        // Create a geometry for the line
        geometry_l1 = new THREE.BufferGeometry().setFromPoints(points_l1);

        // Create a material for the line (red)
        material_l1 = new THREE.LineBasicMaterial({ color: 0xff0000 });

        // Create the line using the geometry and material
        line1 = new THREE.Line(geometry_l1, material_l1);
        xy_plane.add(line1);  // Add the cube mesh

        // Add the line to the scene
    }
    scene.add(xy_plane);


    const arrowX = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 5, 0xff0000);
    scene.add(arrowX);
    const arrowY = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 5, 0x00ff00);
    scene.add(arrowY);
    const arrowZ = new THREE.ArrowHelper(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 5, 0x0000FF);
    scene.add(arrowZ);

    const step = 0.1;
    const priceRange = d3.range(-vmax, vmax + step, step); // x-axis (Price)
    const timeRange = d3.range(-vmax, vmax + step, step);   // y-axis (Time)
    const matrixData = [];
    priceRange.forEach((price, i) => {
        timeRange.forEach((time, j) => {
            matrixData.push({
                x: i, // Convert price to index
                y: j, // Convert time to index
                z: Math.sin((i - vmax) / 4) * Math.sin((j - vmax) / 4) // Replace with your own function
            });
        });
    });

    // Create geometry
    const plane_width = vmax * 2;
    const plane_height = vmax * 2;
    const widthSeg = priceRange.length;
    const heightSeg = timeRange.length;
    const geometry2 = new THREE.PlaneGeometry(plane_width, plane_height, widthSeg - 1, heightSeg - 1);

    // Modify geometry vertices correctly
    const positions = geometry2.attributes.position.array;
    let k = 0;
    for (let i = 0; i < widthSeg; i++) {
        for (let j = 0; j < heightSeg; j++) {
            positions[k + 2] = matrixData[i * heightSeg + j].z; // Set Z value
            k += 3;
        }
    }

    geometry2.attributes.position.needsUpdate = true;

    // Create white material
    const material2 = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, flatShading: true });
    const plane = new THREE.Mesh(geometry2, material2);
    scene.add(plane);

    // Add light for better visibility
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    scene.add(light);


    function animate() {

        mycube.rotation.y += 0.01;
        xy_plane.rotation.z = cameraPosition.z_rotation;
        plane.rotation.z = cameraPosition.z_rotation;
        requestAnimationFrame(animate);
        camera.position.set(cameraPosition.x, cameraPosition.y, cameraPosition.z);  // Camera at (10,10,1)
        renderer.render(scene, camera);
    }
    animate();
}

