// Estimativa automática: lê STL / OBJ / 3MF no navegador, mostra em 3D,
// mede volume, área e tamanho, e calcula peso, tempo e preço aproximados.
// O arquivo NUNCA sai do aparelho do cliente.
//
// A fórmula usa os valores de data/precos.js.
window.ItaEstimativa = (function () {
  // three.js r147, guardado dentro do próprio site (js/vendor/three) para não depender de CDN
  const BASE = "js/vendor/three/";
  const LIBS = {
    core: "build/three.min.js",
    orbit: "examples/js/controls/OrbitControls.js",
    stl: "examples/js/loaders/STLLoader.js",
    obj: "examples/js/loaders/OBJLoader.js",
    fflate: "examples/js/libs/fflate.min.js",
    tmf: "examples/js/loaders/3MFLoader.js"
  };
  const SUPORTADOS = ["stl", "obj", "3mf"];
  const MAX_BYTES = 200 * 1024 * 1024;
  const P = () => window.PRECOS || {};

  const erro = (code, msg) => Object.assign(new Error(msg || code), { code });

  // ---------- Carregamento sob demanda do three.js ----------
  const carregados = {};
  function carregar(k) {
    if (!carregados[k]) {
      carregados[k] = new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = BASE + LIBS[k];
        s.onload = res;
        s.onerror = () => { delete carregados[k]; rej(erro("cdn")); };
        document.head.appendChild(s);
      });
    }
    return carregados[k];
  }
  async function preparar(ext) {
    await carregar("core");
    await carregar("orbit");
    if (ext === "stl") await carregar("stl");
    if (ext === "obj") await carregar("obj");
    if (ext === "3mf") { await carregar("fflate"); await carregar("tmf"); }
  }

  // ---------- Visualizador 3D ----------
  let viewer = null;

  function criarViewer(container) {
    const THREE = window.THREE;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 20000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x555555, 0.85));
    const luz = new THREE.DirectionalLight(0xffffff, 0.75);
    luz.position.set(1, 2, 1.5);
    scene.add(luz);
    const luz2 = new THREE.DirectionalLight(0xffffff, 0.25);
    luz2.position.set(-1.5, 0.5, -1);
    scene.add(luz2);

    // Mesa da impressora em tamanho real, para dar noção de escala
    const mesa = P().mesa || 256;
    const grid = new THREE.GridHelper(mesa, 16, 0x9a9187, 0xc9c1b6);
    grid.material.transparent = true;
    grid.material.opacity = 0.55;
    scene.add(grid);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    controls.autoRotateSpeed = 1.6;
    controls.addEventListener("start", () => { controls.autoRotate = false; });

    const material = new THREE.MeshStandardMaterial({ color: 0xe8611a, roughness: 0.55, metalness: 0.05 });
    const holder = new THREE.Group();
    scene.add(holder);
    let tamanho = [1, 1, 1], escala = 1, vivo = true;

    function redimensionar() {
      const w = container.clientWidth || 1, h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    const ro = new ResizeObserver(redimensionar);
    ro.observe(container);
    redimensionar();

    function enquadrar() {
      const [x, y, z] = tamanho.map((v) => v * escala);
      const r = Math.max(Math.hypot(x, y, z) / 2, 1);
      const fovMin = Math.min(camera.fov, (2 * Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect) * 180) / Math.PI);
      const d = (r / Math.sin((fovMin * Math.PI) / 360)) * 1.6;
      controls.target.set(0, z / 2, 0);
      camera.position.set(d * 0.6, z / 2 + d * 0.45, d * 0.65);
      camera.near = d / 100;
      camera.far = d * 100;
      camera.updateProjectionMatrix();
      controls.update();
    }

    (function loop() {
      if (!vivo) return;
      requestAnimationFrame(loop);
      controls.update();
      renderer.render(scene, camera);
    })();

    return {
      container,
      mostrar(geoms, size) {
        holder.children.slice().forEach((c) => {
          holder.remove(c);
          c.traverse((o) => o.geometry && o.geometry.dispose());
        });
        const g = new THREE.Group();
        geoms.forEach((geo) => g.add(new THREE.Mesh(geo, material)));
        g.rotation.x = -Math.PI / 2; // arquivos 3D usam Z para cima; o three.js usa Y
        holder.add(g);
        tamanho = size;
        escala = 1;
        holder.scale.setScalar(1);
        controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        enquadrar();
      },
      setEscala(s) { escala = s; holder.scale.setScalar(s); enquadrar(); },
      setCor(hex) {
        // Cores muito escuras viram silhueta; clareia um pouco só na prévia
        material.color.set(hex);
        const hsl = {};
        material.color.getHSL(hsl);
        if (hsl.l < 0.2) material.color.setHSL(hsl.h, hsl.s, 0.2);
      },
      destruir() {
        vivo = false;
        ro.disconnect();
        controls.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      }
    };
  }

  // ---------- Leitura e medição ----------
  async function analisar(file, container) {
    const ext = file.name.split(".").pop().toLowerCase();
    if (!SUPORTADOS.includes(ext)) throw erro("formato");
    if (file.size > MAX_BYTES) throw erro("grande");
    await preparar(ext);
    const THREE = window.THREE;
    const buf = await file.arrayBuffer();

    let root;
    try {
      if (ext === "stl") root = new THREE.Mesh(new THREE.STLLoader().parse(buf));
      else if (ext === "obj") root = new THREE.OBJLoader().parse(new TextDecoder().decode(buf));
      else root = new THREE.ThreeMFLoader().parse(buf);
    } catch (e) {
      throw erro("leitura", e && e.message);
    }
    if (!root) throw erro("leitura");
    root.updateMatrixWorld(true);

    const geoms = [];
    root.traverse((o) => {
      if (o.isMesh && o.geometry && o.geometry.attributes.position) {
        let g = o.geometry.clone();
        g.applyMatrix4(o.matrixWorld);
        if (g.index) g = g.toNonIndexed();
        geoms.push(g);
      }
    });
    if (!geoms.length) throw erro("vazio");

    // Volume (soma de tetraedros com sinal), área e caixa
    let vol = 0, area = 0, tris = 0;
    const box = new THREE.Box3();
    for (const g of geoms) {
      const p = g.attributes.position.array;
      for (let i = 0; i + 8 < p.length; i += 9) {
        const ax = p[i], ay = p[i + 1], az = p[i + 2];
        const bx = p[i + 3], by = p[i + 4], bz = p[i + 5];
        const cx = p[i + 6], cy = p[i + 7], cz = p[i + 8];
        vol += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
        const ux = bx - ax, uy = by - ay, uz = bz - az;
        const vx = cx - ax, vy = cy - ay, vz = cz - az;
        area += 0.5 * Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
        tris++;
      }
      g.computeBoundingBox();
      box.union(g.boundingBox);
    }
    vol = Math.abs(vol);
    const size = box.getSize(new THREE.Vector3());
    const centro = box.getCenter(new THREE.Vector3());
    geoms.forEach((g) => {
      g.translate(-centro.x, -centro.y, -box.min.z);
      g.computeVertexNormals(); // muitos STL vêm com normais zeradas
    });

    const caixa = size.x * size.y * size.z;
    const resultado = {
      volume: vol,                      // mm³
      area: area,                       // mm²
      size: [size.x, size.y, size.z],   // mm (X, Y, altura)
      triangulos: tris,
      malhaSuspeita: vol < 1e-6 || vol > caixa * 1.02
    };

    if (!viewer || viewer.container !== container) {
      if (viewer) viewer.destruir();
      viewer = criarViewer(container);
    }
    viewer.mostrar(geoms, resultado.size);
    return resultado;
  }

  // ---------- Fórmula ----------
  //  opts: { material, resolucao, finalidade, esboco, multicor, qtd, escala }
  function calcular(a, o) {
    const p = P();
    const m = (p.materiais || {})[o.material];
    if (!m) return null;
    const s = (o.escala || 100) / 100;
    const V = a.volume * s * s * s;
    const A = a.area * s * s;
    const H = a.size[2] * s;
    const resKey = o.esboco ? "baixa" : o.resolucao;
    const q = p.qualidade[o.esboco ? "esboco" : o.finalidade];

    const casca = Math.min(V, A * q.paredes * p.larguraLinha);
    const vMat = (casca + (V - casca) * q.preenchimento) * p.fatorSuporte; // mm³ por peça
    const gramas = (vMat / 1000) * m.densidade;

    const fluxo = p.fluxo[resKey] * m.fatorVelocidade;
    const camadas = Math.ceil(H / p.camadas[resKey]);
    const segPeca = vMat / fluxo + camadas * p.segundosPorCamada;

    const qtd = Math.max(1, o.qtd || 1);
    const segundos = segPeca * qtd + p.segundosPreparo;
    const custoFil = (gramas / 1000) * m.precoKg;
    const custoMaq = (segPeca / 3600) * p.precoHora;
    const custo = custoFil + custoMaq;
    let unit = custo * p.margem;
    if (o.multicor) unit *= 1 + p.multicor.adicional;
    const preco = Math.max(p.precoMinimo, unit * qtd + p.taxaFixa);

    return {
      gramas: gramas * qtd,
      segundos,
      preco,
      min: Math.max(p.precoMinimo, Math.floor(preco * p.faixa[0])),
      max: Math.ceil(preco * p.faixa[1]),
      // Custo de fabricação (filamento + hora de máquina), sem margem nem taxa fixa
      custoFilamento: custoFil * qtd,
      custoMaquina: custoMaq * qtd,
      custo: custo * qtd,
      multicor: !!o.multicor
    };
  }

  function fmtTempo(seg) {
    const min = Math.max(5, Math.round(seg / 60 / 5) * 5);
    const h = Math.floor(min / 60), r = min % 60;
    return "≈ " + (h ? h + " h" + (r ? " " + r + " min" : "") : r + " min");
  }

  return {
    suportado: (ext) => SUPORTADOS.includes(ext),
    analisar,
    calcular,
    fmtTempo,
    setCor: (hex) => viewer && viewer.setCor(hex),
    setEscala: (s) => viewer && viewer.setEscala(s),
    mesa: () => P().mesa || 256
  };
})();
