// project-viewer.js - Simple 3D viewer for STL models

// Global Three.js variables
let scene, camera, renderer, controls;
let currentModel = null;
let isWireframe = false;

// Project data
const projectData = {
    'perba': {
        name: 'PerBa - Automatic Cocktail Mixer',
        category: 'Automation',
        description: 'An automated cocktail mixing machine with precision dispensing system, user interface, and recipe management.',
        github: 'https://github.com/PoyntingPro/PerBa',
        image: 'https://github.com/anim1311/PerBa/assets/65235028/b070a780-2787-4d52-b3de-943d75119fe0',
        techStack: ['Arduino', 'C++', 'KiCAD', 'Fusion 360', '3D Printing']
    },
    'usb-dac': {
        name: 'USB-C based DAC',
        category: 'Electronics', 
        description: 'High-quality digital-to-analog converter with USB-C interface and professional audio processing.',
        github: 'https://github.com/PoyntingPro/USB_DAC',
        image: 'https://github.com/user-attachments/assets/1a4cd634-ebe2-4b9e-8b57-ce525966139d',
        techStack: ['KiCAD', 'Audio Processing', 'USB-C', 'PCB Design']
    },
    'wifiaudiolink2': {
        name: 'WiFiAudioLink 2',
        category: 'Electronics',
        description: 'Advanced wireless audio transmission system with ESP32-based design and real-time streaming.',
        github: 'https://github.com/PoyntingPro/WifiAudioLink2',
        image: 'https://github.com/user-attachments/assets/6b79064e-8209-4695-89de-4bac2573f113',
        techStack: ['ESP32', 'C++', 'WiFi Protocol', 'Audio Processing']
    }
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('project') || 'perba';
    
    loadProjectData(projectId);
    initThreeJS();
    loadSTLModel(projectId);
    setupEventListeners();
}

function loadProjectData(projectId) {
    const project = projectData[projectId];
    if (!project) return;

    document.getElementById('project-title').textContent = project.name;
    document.getElementById('project-name').textContent = project.name;
    document.getElementById('project-category').textContent = project.category;
    document.getElementById('project-description').textContent = project.description;
    document.getElementById('github-link').href = project.github;
    document.getElementById('project-thumbnail').src = project.image;

    // Load tech tags
    const techContainer = document.getElementById('tech-tags');
    techContainer.innerHTML = project.techStack.map(tech => 
        `<span class="tech-tag">${tech}</span>`
    ).join('');
}

function initThreeJS() {
    const canvas = document.getElementById('three-canvas');
    const container = canvas.parentElement;

    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1e1e1e);

    // Camera
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(4, 3, 4);  // Better angle for viewing centered models
    camera.lookAt(0, 0, 0);  // Look at center

    // Renderer
    renderer = new THREE.WebGLRenderer({ 
        canvas: canvas, 
        antialias: true 
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // Controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-5, 5, -5);
    scene.add(fillLight);

    // Start animation
    animate();
}

function loadSTLModel(projectId) {
    // Check if VRMLLoader is available
    if (typeof THREE.VRMLLoader === 'undefined') {
        console.error('VRMLLoader not available, using default model');
        createDefaultModel();
        document.getElementById('loading-indicator').style.display = 'none';
        return;
    }

    // Only load WRL files
    const vrmlLoader = new THREE.VRMLLoader();
    const wrlPath = `./assets/Models/${projectId}.wrl`;
    
    console.log('Loading WRL file:', wrlPath);
    
    vrmlLoader.load(
        wrlPath,
        function(vrmlScene) {
            console.log('WRL file loaded successfully');
            processVRMLModel(vrmlScene);
            document.getElementById('loading-indicator').style.display = 'none';
        },
        function(progress) {
            console.log('Loading WRL progress:', progress);
        },
        function(error) {
            console.error('Error loading WRL file:', error);
            console.log('Creating fallback demo model');
            createDefaultModel();
            document.getElementById('loading-indicator').style.display = 'none';
        }
    );
}

// Remove the STL and OBJ loading functions since we only want WRL
function processVRMLModel(vrmlScene) {
    console.log('Processing VRML scene:', vrmlScene);
    
    // VRML loader returns a scene, extract the meshes
    const group = new THREE.Group();
    
    vrmlScene.traverse(function(child) {
        if (child.isMesh) {
            console.log('Found mesh in VRML:', child);
            // Keep original materials from VRML file but ensure they work with lighting
            if (child.material) {
                // Convert basic material to standard material for better lighting
                if (child.material.type === 'MeshBasicMaterial') {
                    child.material = new THREE.MeshStandardMaterial({
                        color: child.material.color,
                        roughness: 0.3,
                        metalness: 0.4
                    });
                }
            } else {
                // Fallback material
                child.material = new THREE.MeshStandardMaterial({ 
                    color: 0x888888,
                    roughness: 0.3,
                    metalness: 0.4
                });
            }
            child.castShadow = true;
            child.receiveShadow = true;
            group.add(child.clone());
        }
    });

    if (group.children.length === 0) {
        console.warn('No meshes found in VRML file, using default model');
        createDefaultModel();
        return;
    }

    // Center and scale the group
    const box = new THREE.Box3().setFromObject(group);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    console.log('Model bounds:', { center, size });
    
    // Move to origin
    group.position.x = -center.x;
    group.position.y = -center.y;
    group.position.z = -center.z;
    
    // Scale to fit nicely
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDim;
    group.scale.setScalar(scale);
    
    // Position slightly above ground
    group.position.y += (size.y * scale) * 0.1;

    addGroundPlane();
    currentModel = group;
    scene.add(currentModel);
    
    console.log('VRML model added to scene');
}

function tryLoadOBJ(projectId) {
    const objLoader = new THREE.OBJLoader();
    const objPath = `./assets/Models/${projectId}.obj`;
    
    objLoader.load(
        objPath,
        function(object) {
            processOBJModel(object);
            document.getElementById('loading-indicator').style.display = 'none';
        },
        function(progress) {
            console.log('Loading OBJ progress:', progress);
        },
        function(error) {
            console.log('No 3D model files found, using demo model');
            createDefaultModel();
            document.getElementById('loading-indicator').style.display = 'none';
        }
    );
}

function processOBJModel(object) {
    object.traverse(function(child) {
        if (child.isMesh) {
            child.material = new THREE.MeshStandardMaterial({ 
                color: 0xff6b35,
                roughness: 0.4,
                metalness: 0.1
            });
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });

    // Center and scale
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    object.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    object.scale.setScalar(4 / maxDim);

    addGroundPlane();
    currentModel = object;
    scene.add(currentModel);
}

function addGroundPlane() {
    const planeGeo = new THREE.PlaneGeometry(20, 20);
    const planeMat = new THREE.MeshStandardMaterial({ 
        color: 0x333333, 
        transparent: true, 
        opacity: 0.1 
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2;
    plane.receiveShadow = true;
    scene.add(plane);
}

function processSTLGeometry(geometry) {
    geometry.computeBoundingBox();
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xff6b35,
        roughness: 0.4,
        metalness: 0.1
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    // Center and scale the model
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    mesh.position.sub(center);
    const maxDim = Math.max(size.x, size.y, size.z);
    mesh.scale.setScalar(4 / maxDim);

    // Add ground plane
    const planeGeo = new THREE.PlaneGeometry(20, 20);
    const planeMat = new THREE.MeshStandardMaterial({ 
        color: 0x333333, 
        transparent: true, 
        opacity: 0.1 
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2;
    plane.receiveShadow = true;
    scene.add(plane);

    currentModel = mesh;
    scene.add(currentModel);
}

function createDefaultModel() {
    // Fallback model if STL doesn't load
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0xff6b35 });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;

    // Add some detail
    const group = new THREE.Group();
    group.add(cube);

    const cylinderGeo = new THREE.CylinderGeometry(0.3, 0.3, 3, 16);
    const cylinderMat = new THREE.MeshStandardMaterial({ color: 0x35a7ff });
    
    for (let i = 0; i < 4; i++) {
        const cylinder = new THREE.Mesh(cylinderGeo, cylinderMat);
        const angle = (i / 4) * Math.PI * 2;
        cylinder.position.x = Math.cos(angle) * 1.5;
        cylinder.position.z = Math.sin(angle) * 1.5;
        cylinder.rotation.x = Math.PI / 2;
        cylinder.castShadow = true;
        group.add(cylinder);
    }

    // Ground plane
    const planeGeo = new THREE.PlaneGeometry(20, 20);
    const planeMat = new THREE.MeshStandardMaterial({ 
        color: 0x333333, 
        transparent: true, 
        opacity: 0.1 
    });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -2;
    plane.receiveShadow = true;
    scene.add(plane);

    currentModel = group;
    scene.add(currentModel);
}

function resetCamera() {
    camera.position.set(4, 3, 4);  // Better viewing angle
    camera.lookAt(0, 0, 0);
    controls.reset();
}

function toggleWireframe() {
    if (!currentModel) return;
    
    isWireframe = !isWireframe;
    currentModel.traverse(child => {
        if (child.isMesh && child.material) {
            child.material.wireframe = isWireframe;
        }
    });
}

// Expose functions globally so they can be called from HTML
window.resetCamera3D = resetCamera;
window.toggleWireframe3D = toggleWireframe;

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    
    document.addEventListener('keydown', (event) => {
        switch(event.key.toLowerCase()) {
            case 'r':
                resetCamera();
                break;
            case 'w':
                toggleWireframe();
                break;
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    const canvas = document.getElementById('three-canvas');
    const container = canvas.parentElement;
    
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}