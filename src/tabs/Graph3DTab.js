import React, { useEffect, useRef, useState, useContext } from 'react';
import { AppContext } from '../AppContext';
import { compute_p_and_l_data_for_price, compute_data_to_display, compute_greeks_data_for_price } from '../utils/computation.js';
import { RadioButton } from '../components/RadioButton.js';
import * as THREE from 'three';


function createLinearScale(domainMin, domainMax, rangeMin, rangeMax) {
  const domainSpan = domainMax - domainMin;
  const rangeSpan = rangeMax - rangeMin;

  return function (value) {
    const t = (value - domainMin) / domainSpan;  // normalized [0–1]
    return rangeMin + t * rangeSpan;             // scale to range
  };
}
function range(start, stop, step = 1) {
  const result = [];
  for (let i = start; i < stop; i += step) {
    result.push(+i.toFixed(10)); // avoid floating-point rounding issues
  }
  return result;
}

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
    this.min_data = Math.min(...this.data.flat().map(d => d.y));
    this.max_data = Math.max(...this.data.flat().map(d => d.y));
    this.xscale = createLinearScale(this.x_min, this.x_max, -this.half_width, this.half_width);
    this.yscale = createLinearScale(this.y_min, this.y_max, -this.half_width, this.half_width);
    const absMax = Math.max(Math.abs(this.min_data), Math.abs(this.max_data));
    this.zscale = createLinearScale(-absMax, absMax, -this.half_width, this.half_width);
    this.xrange = range(this.x_min, this.x_max + 1e-5, this.x_step);
    this.yrange = range(this.y_min, this.y_max + 1e-5, this.y_step);
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

  run(dataManager, greek_index, z_zoom_factor) {
    let count = 0;
    const time_for_simulation = dataManager.get_time_for_simulation_of_active_combo()
    this.xrange.forEach((x, i) => {
      this.yrange.forEach((y, j) => {

        const use_legs_volatility = true
        dataManager.set_time_for_simulation_of_active_combo(y);
        let z = compute_greeks_data_for_price(dataManager, greek_index, use_legs_volatility, x);
        this.matrixData[count] = {
          x: this.xscale(x),
          y: this.yscale(y),
          z: this.zscale(z.y * z_zoom_factor)
        };

        count++;
      });
    });
    dataManager.set_time_for_simulation_of_active_combo(time_for_simulation);
    return [this.xrange, this.yrange, this.matrixData];
  }
}

class PLSurface extends Generic3DSurface {

  run(global_data, z_zoom_factor) {
    let count = 0;
    this.xrange.forEach((x, i) => {
      this.yrange.forEach((y, j) => {

        const use_legs_volatility = true
        let z = compute_p_and_l_data_for_price(global_data, use_legs_volatility, y, x);

        this.matrixData[count] = {
          x: this.xscale(x),
          y: -this.yscale(y),
          z: this.zscale(z.y * z_zoom_factor)
        };

        count++;
      });
    });
    return [this.xrange, this.yrange, this.matrixData];
  }
}



const ref_plane_half_size = 10;
let animationId = null;
let renderer = null;
let scene = null;
let camera = null;

/*
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
  */
function create_pl_vs_time_and_price_surface(dataManager) {
  let surface = new PLSurface();
  surface.set_x_limits(dataManager.get_simul_min_price_of_combo(), dataManager.get_simul_max_price_of_combo(), 20);
  surface.set_y_limits(0, dataManager.get_time_to_expiry_of_active_combo(), 20);
  surface.prepare_dataset([dataManager.get_pl_at_init_data(), dataManager.get_pl_at_sim_data(), dataManager.get_pl_at_exp_data()]);
  return surface.run(dataManager, 1);
}

function create_greek_vs_time_and_price_surface(greek_index, dataManager) {
  let surface = new GreekSurface();
  surface.set_x_limits(dataManager.get_simul_min_price_of_combo(), dataManager.get_simul_max_price_of_combo(), 20);
  surface.set_y_limits(0, dataManager.get_time_to_expiry_of_active_combo(), 20);
  surface.prepare_dataset([dataManager.get_greeks_data()[greek_index]]);
  return surface.run(dataManager, greek_index, 1);
}

function create_specific_lines(dataManager, cameraPosition) {

  let lines = new THREE.Group();

  const min_price = dataManager.get_simul_min_price_of_combo();
  const max_price = dataManager.get_simul_max_price_of_combo();
  const min_p_and_l = dataManager.get_min_of_dataset();
  const max_p_and_l = dataManager.get_max_of_dataset();
  const min_time = 0;
  const max_time = dataManager.get_time_to_expiry_of_active_combo();

  let time_to_xscale = createLinearScale(max_time, min_time, -ref_plane_half_size, ref_plane_half_size);

  let price_to_yscale = createLinearScale(min_price, max_price, -ref_plane_half_size, ref_plane_half_size);

  const absMax = Math.max(Math.abs(min_p_and_l), Math.abs(max_p_and_l));
  let zscale = createLinearScale(-absMax, absMax, -ref_plane_half_size, ref_plane_half_size);



  const green_points = [];
  const black_points = [];
  const orange_points = [];

  const num_points = Math.round(dataManager.get_pl_at_exp_data().length / 50);
  let x = time_to_xscale(0);
  const y2 = price_to_yscale(dataManager.get_pl_at_exp_data()[0].x);
  let z2 = dataManager.get_pl_at_exp_data()[0].y * cameraPosition.current.z_zoom_factor;
  black_points.push(new THREE.Vector3(x, y2, zscale(z2)));
  x = time_to_xscale(dataManager.get_time_for_simulation_of_active_combo());
  z2 = dataManager.get_pl_at_sim_data()[0].y * cameraPosition.current.z_zoom_factor;
  green_points.push(new THREE.Vector3(x, y2, zscale(z2)));
  x = time_to_xscale(dataManager.get_time_to_expiry_of_active_combo());
  z2 = dataManager.get_pl_at_init_data()[0].y * cameraPosition.current.z_zoom_factor;
  orange_points.push(new THREE.Vector3(x, y2, zscale(z2)));

  for (let i = 0; i < dataManager.get_pl_at_exp_data().length - num_points; i += num_points) {
    let x = time_to_xscale(0);
    const y2 = price_to_yscale(dataManager.get_pl_at_exp_data()[i + num_points].x);
    let z2 = dataManager.get_pl_at_exp_data()[i + num_points].y * cameraPosition.current.z_zoom_factor;
    black_points.push(new THREE.Vector3(x, y2, zscale(z2)));

    x = time_to_xscale(dataManager.get_time_for_simulation_of_active_combo());
    z2 = dataManager.get_pl_at_sim_data()[i + num_points].y * cameraPosition.current.z_zoom_factor;
    green_points.push(new THREE.Vector3(x, y2, zscale(z2)));

    x = time_to_xscale(dataManager.get_time_to_expiry_of_active_combo());
    z2 = dataManager.get_pl_at_init_data()[i + num_points].y * cameraPosition.current.z_zoom_factor;
    orange_points.push(new THREE.Vector3(x, y2, zscale(z2)));

  }

  const black_geometry = new THREE.BufferGeometry().setFromPoints(black_points);
  const black_material = new THREE.LineBasicMaterial({ color: 0xFFFFFF });
  const black_line = new THREE.Line(black_geometry, black_material);
  lines.add(black_line);


  const green_geometry = new THREE.BufferGeometry().setFromPoints(green_points);
  const green_material = new THREE.LineBasicMaterial({ color: 0x00FF00 });
  const green_line = new THREE.Line(green_geometry, green_material);
  lines.add(green_line);

  const orange_geometry = new THREE.BufferGeometry().setFromPoints(orange_points);
  const orange_material = new THREE.LineBasicMaterial({ color: 0xf8ae00 });
  const orange_line = new THREE.Line(orange_geometry, orange_material);
  lines.add(orange_line);


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
function display_reference_arrows(scene) {

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
  //ctx_3.fillText(dataManager.get_3d_view(), canvas_3.width / 2, 40);
  ctx_3.fillText("Z", canvas_3.width / 2, 40);
  const texture_3 = new THREE.CanvasTexture(canvas_3);
  const material_3 = new THREE.SpriteMaterial({ map: texture_3, transparent: true });
  const sprite_3 = new THREE.Sprite(material_3);
  sprite_3.scale.set(4, 1.5, 1); // Adjust as needed
  sprite_3.position.set(-ref_plane_half_size, -ref_plane_half_size, ref_plane_half_size); // Offset from center (so it orbits)
  pivot_3.add(sprite_3);


}
function display_reference_plane(scene) {
  const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 0), 0); // z = 0
  const planeHelper = new THREE.PlaneHelper(planeZ, 2 * ref_plane_half_size, 0xadd8e6); // size, color (light blue)
  scene.add(planeHelper);
}
function light(scene) {
  const omniLight = new THREE.AmbientLight(0xffffff);
  omniLight.position.set(0, 0, 20); // Position it in the scene
  scene.add(omniLight);

}
function prepare_scence(cameraPosition) {
  scene = new THREE.Scene();

  const material_color = getComputedStyle(document.body).getPropertyValue("--bg-main-container").trim();
  scene.background = new THREE.Color(material_color);
  camera = new THREE.PerspectiveCamera(cameraPosition.current.fov, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.up.set(0, 0, 1);          // Make Z the "up" direction

  let theta = cameraPosition.current.z_rotation / 180.0 * Math.PI;
  let alpha = cameraPosition.current.view_angle / 180.0 * Math.PI;
  cameraPosition.current.x = cameraPosition.current.dist * Math.cos(theta) * Math.cos(alpha);
  cameraPosition.current.y = cameraPosition.current.dist * Math.sin(theta) * Math.cos(alpha);
  cameraPosition.current.z = cameraPosition.current.dist * Math.sin(alpha);
  camera.position.set(cameraPosition.current.x, cameraPosition.current.y, cameraPosition.current.z);
  camera.lookAt(0, 0, 0);          // Looking at (0,0,0)
  return scene;
}
function create_rendered(view3d_graph_container) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(view3d_graph_container.clientWidth, view3d_graph_container.clientHeight);
  view3d_graph_container.appendChild(renderer.domElement);
  return renderer;
}

export default function Graph3DTab({ }) {

  const surfaceSelectorRef = useRef(null);
  const controllerRef = useRef(null);
  const [render3DTrigger, setRender3DTrigger] = useState(0);
  const { dataManager } = useContext(AppContext);
  const { renderTrigger } = useContext(AppContext);
  const { byLeg } = useContext(AppContext);

  const cameraPosition = useRef({
    x: 17,
    y: 17,
    dist: 50,
    z: 1.4,
    fov: 40,
    z_rotation: 30,
    z_zoom_factor: 1,
    view_angle: 10
  });

  const containerRef = useRef(null);
  const [parentSize, setParentSize] = useState({ width: 0, height: 0 });

  const get_show_3dbox = () => {
    return true;
  }
  const set_show_3dbox = (value) => {
  }
  function handleRadioChange() {
    if (this.checked) {
      dataManager.set_3d_view(this.value);
      console.log("this.value", this.value);
      setRender3DTrigger(t => t + 1);

    }
  }

  useEffect(() => {

    if (!controllerRef.current) return;

    const updateSize = () => {
      const parent = containerRef.current?.parentElement;
      if (parent) {
        const { width, height } = parent.getBoundingClientRect();
        setParentSize({ width: Math.round(width), height: Math.round(height) });
      }
    };
    const topSelectorWrapper = document.createElement("div");
    topSelectorWrapper.style.display = "flex";
    topSelectorWrapper.style.flexDirection = "row";
    topSelectorWrapper.style.alignItems = "flex-start";
    topSelectorWrapper.style.justifyContent = "flex-start";
    topSelectorWrapper.style.width = "100%";
    topSelectorWrapper.style.gap = "30px";

    const container1 = surfaceSelectorRef.current;
    container1.innerHTML = '';

    let radioGroup = document.createElement('div');
    radioGroup.id = 'radio-group';
    radioGroup.style.display = 'flex';
    radioGroup.style.flexDirection = 'row';
    radioGroup.style.alignItems = 'center';
    radioGroup.style.gap = '12px';

    let radio1 = new RadioButton('3d-options', 'P/L', handleRadioChange);
    radio1.appendTo(radioGroup);
    radio1.radio.checked = true;
    new RadioButton('3d-options', 'Delta', handleRadioChange).appendTo(radioGroup);
    new RadioButton('3d-options', 'Gamma', handleRadioChange).appendTo(radioGroup);
    new RadioButton('3d-options', 'Theta', handleRadioChange).appendTo(radioGroup);
    new RadioButton('3d-options', 'Vega', handleRadioChange).appendTo(radioGroup);
    new RadioButton('3d-options', 'Rho', handleRadioChange).appendTo(radioGroup);
    topSelectorWrapper.appendChild(radioGroup);
    container1.appendChild(topSelectorWrapper);

    const topControlsWrapper = document.createElement("div");
    topControlsWrapper.style.display = "flex";
    topControlsWrapper.style.flexDirection = "row";
    topControlsWrapper.style.alignItems = "center";
    topControlsWrapper.style.justifyContent = "flex-start";
    topControlsWrapper.style.width = "100%";
    topControlsWrapper.style.gap = "30px";

    const container = controllerRef.current;
    container.innerHTML = '';

    const slidersWrapper = document.createElement("div");
    slidersWrapper.style.display = "flex";
    slidersWrapper.style.flexDirection = "row";
    slidersWrapper.style.justifyContent = "space-around";
    slidersWrapper.style.alignItems = "flex-end";
    slidersWrapper.style.gap = "30px";
    slidersWrapper.style.width = "100%";

    // === DISTANCE ===
    const label_dist = document.createElement("span");
    label_dist.className = "checkbox-title";
    label_dist.id = "camera-position-zpos-label";
    label_dist.textContent = "dist=" + cameraPosition.current.dist;

    const slider_cam_dist = document.createElement("input");
    slider_cam_dist.type = "range";
    slider_cam_dist.min = 2;
    slider_cam_dist.max = 100;
    slider_cam_dist.step = 1;
    slider_cam_dist.value = cameraPosition.current.dist;
    slider_cam_dist.style.width = "150px";

    slider_cam_dist.addEventListener("input", function () {
      cameraPosition.current.dist = parseFloat(this.value);
      label_dist.textContent = "dist=" + cameraPosition.current.dist;
      setRender3DTrigger(t => t + 1);
    });

    topControlsWrapper.appendChild(label_dist);
    topControlsWrapper.appendChild(slider_cam_dist);

    // === Z ROTATION ===
    const label_rot = document.createElement("span");
    label_rot.className = "checkbox-title";
    label_rot.id = "camera-position-zrot-label";
    label_rot.textContent = "θ=" + cameraPosition.current.z_rotation + "°";

    const slider_zrotation = document.createElement("input");
    slider_zrotation.type = "range";
    slider_zrotation.min = -360;
    slider_zrotation.max = 360;
    slider_zrotation.step = 1;
    slider_zrotation.value = cameraPosition.current.z_rotation;
    slider_zrotation.style.width = "150px";

    slider_zrotation.addEventListener("input", function () {
      cameraPosition.current.z_rotation = parseFloat(this.value);
      label_rot.textContent = "θ=" + cameraPosition.current.z_rotation + "°";
      setRender3DTrigger(t => t + 1);
    });

    topControlsWrapper.appendChild(label_rot);
    topControlsWrapper.appendChild(slider_zrotation);

    // === VIEW ANGLE (α) ===
    const label_view = document.createElement("span");
    label_view.className = "checkbox-title";
    label_view.id = "camera-view-angle-label";
    label_view.textContent = "α=" + cameraPosition.current.view_angle + "°";

    const slider_view_angle = document.createElement("input");
    slider_view_angle.type = "range";
    slider_view_angle.min = -90;
    slider_view_angle.max = 90;
    slider_view_angle.step = 1;
    slider_view_angle.value = cameraPosition.current.view_angle;
    slider_view_angle.style.width = "150px";

    slider_view_angle.addEventListener("input", function () {
      const value = parseFloat(this.value);
      cameraPosition.current.view_angle = value;
      label_view.textContent = "α=" + value + "°";
      setRender3DTrigger(t => t + 1);
    });

    topControlsWrapper.appendChild(label_view);
    topControlsWrapper.appendChild(slider_view_angle);


    // === 3D Box Checkbox ===
    const show3DBoxContainer = document.createElement("div");
    show3DBoxContainer.style.display = "flex";
    show3DBoxContainer.style.alignItems = "center";
    show3DBoxContainer.style.gap = "10px";
    show3DBoxContainer.className = "simple_checkbox";

    const show3DBox_label = document.createElement("span");
    show3DBox_label.className = "std-text";
    show3DBox_label.textContent = "3DBox ";

    const show3DBox_checkbox = document.createElement("input");
    show3DBox_checkbox.type = "checkbox";
    show3DBox_checkbox.id = "show-3dbox-container";
    show3DBox_checkbox.name = "show-3dbox-container";
    show3DBox_checkbox.checked = get_show_3dbox();

    show3DBox_checkbox.addEventListener("change", function () {
      set_show_3dbox(this.checked);
      setRender3DTrigger(t => t + 1);
    });

    topControlsWrapper.appendChild(show3DBox_label);
    topControlsWrapper.appendChild(show3DBox_checkbox);
    container.appendChild(topControlsWrapper);

    window.addEventListener('resize', updateSize);
    updateSize(); // initial measure



    return () => {
    };
  }, []);



  useEffect(() => {
    const view3d_graph_container = containerRef.current;
    if (!dataManager) return;
    if (!view3d_graph_container) return;
    view3d_graph_container.innerHTML = '';

    cleanupThree();

    scene = prepare_scence(cameraPosition);
    const renderer = create_rendered(view3d_graph_container, cameraPosition);
    draw_axis_arrows(scene);
    display_reference_arrows(scene);
    display_reference_plane(scene);
    light(scene);

    compute_data_to_display(dataManager, byLeg);
    console.log("dataManager.get_3d_view()", dataManager.get_3d_view());
    if (dataManager.get_3d_view() === "P/L") {
      let curve_data = create_pl_vs_time_and_price_surface(dataManager);
      let mesh_data = create_mesh_color_heatmap(curve_data, 0);
      scene.add(mesh_data[0]);
      const lines = create_specific_lines(dataManager, cameraPosition)
      scene.add(lines);
    }
    else if (dataManager.get_3d_view() === "Delta") {
      let curve_data = create_greek_vs_time_and_price_surface(1, dataManager);
      console.log("curve_data", curve_data);
      let mesh_data = create_mesh_color_heatmap(curve_data, 0);
      scene.add(mesh_data[0]);
    }
    else if (dataManager.get_3d_view() === "Gamma") {
      let curve_data = create_greek_vs_time_and_price_surface(2, dataManager);
      console.log("curve_data", curve_data);
      let mesh_data = create_mesh_color_heatmap(curve_data, 0);
      scene.add(mesh_data[0]);
    }
    else if (dataManager.get_3d_view() === "Theta") {
      let curve_data = create_greek_vs_time_and_price_surface(3, dataManager);
      console.log("curve_data", curve_data);
      let mesh_data = create_mesh_color_heatmap(curve_data, 0);
      scene.add(mesh_data[0]);
    }
    else if (dataManager.get_3d_view() === "Vega") {
      let curve_data = create_greek_vs_time_and_price_surface(4, dataManager);
      console.log("curve_data", curve_data);
      let mesh_data = create_mesh_color_heatmap(curve_data, 0);
      scene.add(mesh_data[0]);
    }
    else if (dataManager.get_3d_view() === "Rho") {
      let curve_data = create_greek_vs_time_and_price_surface(5, dataManager);
      console.log("curve_data", curve_data);
      let mesh_data = create_mesh_color_heatmap(curve_data, 0);
      scene.add(mesh_data[0]);
    }



    renderer.render(scene, camera);
  }, [dataManager, renderTrigger, byLeg, render3DTrigger]);



  return (
    <div style={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>

      <div
        className="view3d-controler-container"
        style={{ flex: '0 0 0%', width: '100%' }}
        ref={surfaceSelectorRef}
      />
      <div
        className="view3d-controler-container"
        style={{ flex: '0 0 0%', width: '100%' }}
        ref={controllerRef}
      />
      <div ref={containerRef}
        className="view3d-graph-container"
        style={{ flex: '1 1 auto', width: '100%' }}
      >
      </div>



    </div>
  );

}
