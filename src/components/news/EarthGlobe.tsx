import { useEffect, useRef, useState } from 'react';
import type * as THREETypes from 'three';
import { COUNTRY_COORDS } from '../../lib/geo';

/**
 * The Earth, as NASA's Eyes renders it.
 *
 * A textured sphere on WebGL: Blue Marble daylight, city lights on the far
 * limb, a drifting cloud shell, a rim of atmosphere and a star field. Desks
 * are plotted as pins at their capital so the globe carries the same
 * information as the rest of the site.
 *
 * The globe sits on its own dark plate in both themes. A photoreal Earth is a
 * dark object; forcing it into a cream page turns it into a smudge. Framed as
 * an inset — plate, hairline border, caption — it reads as a printed
 * photograph, which is the honest way to put space on paper.
 *
 * three.js is imported dynamically, so its bundle only loads when this
 * component mounts. Textures are WebP copies of the public-domain NASA set,
 * ~250KB for all five.
 */

interface EarthGlobeProps {
  /** Country name to article count. Drives pin size and brightness. */
  counts: Record<string, number>;
  className?: string;
  /** Where the viewer starts looking, in degrees. */
  focus?: { lat: number; lon: number };
}

const DEG = Math.PI / 180;
const TEX = `${import.meta.env.BASE_URL}textures`;

export function EarthGlobe({ counts, className = '', focus }: EarthGlobeProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed'>('loading');

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let frame = 0;
    let renderer: THREETypes.WebGLRenderer | undefined;
    let observer: ResizeObserver | undefined;
    const cleanups: (() => void)[] = [];

    async function boot() {
      const width = mount!.clientWidth || 480;
      const height = mount!.clientHeight || 480;

      // Loaded here rather than at module scope so three.js is fetched only
      // when the globe actually mounts, and never on the rest of the site.
      let THREE: typeof THREETypes;
      try {
        THREE = await import('three');
      } catch {
        if (!disposed) setStatus('failed');
        return;
      }
      if (disposed) return;

      try {
        renderer = new THREE.WebGLRenderer({
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        });
      } catch {
        if (!disposed) setStatus('failed');
        return;
      }
      if (disposed) return;

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(width, height, false);
      renderer.setClearColor(0x000000, 0);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.cursor = 'grab';
      renderer.domElement.style.touchAction = 'none';
      mount!.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 200);

      // The globe is a child group, so every rotation below happens on the
      // group and the camera stays on the +Z axis. Mixing a positioned camera
      // with a sphere's own UVs is what produced a globe facing the wrong
      // meridian: the two use different conventions for longitude.
      const globe = new THREE.Group();
      scene.add(globe);

      const startLat = focus?.lat ?? 18;
      const startLon = focus?.lon ?? 80;
      // 4.1 fills ~75% of the shorter side: the planet dominates the plate the
      // way a printed photograph does, while keeping sky on every edge.
      camera.position.set(0, 0, 4.1);
      camera.lookAt(0, 0, 0);

      // Orientation is built as one quaternion rather than two Euler angles.
      // SphereGeometry's vertex formula is phi = lon + 180, theta = 90 - lat,
      // and composing X and Y Euler angles in the default order silently
      // applies them in the wrong sequence — which points the globe at the
      // wrong meridian while still looking plausible. Multiplying the two
      // matrices explicitly keeps the order unambiguous; the signs were
      // checked by raycasting the centre of the frame and reading back the
      // texture coordinate, which must come out as `focus`.
      const orient = (lat: number, lon: number) =>
        new THREE.Quaternion().setFromRotationMatrix(
          new THREE.Matrix4()
            .makeRotationX(lat * DEG)
            .multiply(new THREE.Matrix4().makeRotationY(-(lon + 90) * DEG))
        );
      globe.quaternion.copy(orient(startLat, startLon));

      // --- stars -----------------------------------------------------------
      const starCount = 1600;
      const starPositions = new Float32Array(starCount * 3);
      const starTints = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i += 1) {
        const u = Math.random() * 2 - 1;
        const theta = Math.random() * Math.PI * 2;
        const r = 30 + Math.random() * 24;
        const s = Math.sqrt(1 - u * u);
        starPositions[i * 3] = r * s * Math.cos(theta);
        starPositions[i * 3 + 1] = r * u;
        starPositions[i * 3 + 2] = r * s * Math.sin(theta);
        // Most stars read white; a few lean warm or cool.
        const tint = Math.random();
        const warm = tint > 0.88;
        const cool = tint < 0.12;
        starTints[i * 3] = warm ? 1 : cool ? 0.78 : 0.95;
        starTints[i * 3 + 1] = 0.94;
        starTints[i * 3 + 2] = warm ? 0.82 : cool ? 1 : 0.95;
      }
      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      starGeometry.setAttribute('color', new THREE.BufferAttribute(starTints, 3));
      const starMaterial = new THREE.PointsMaterial({
        size: 0.1,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });
      const stars = new THREE.Points(starGeometry, starMaterial);
      scene.add(stars);

      // --- textures --------------------------------------------------------
      const loader = new THREE.TextureLoader();
      const load = (file: string) =>
        new Promise<THREETypes.Texture>((resolve, reject) => {
          loader.load(
            `${TEX}/${file}`,
            (texture) => {
              // Raw sRGB, not linear: the shader below grades in display space
              // and writes straight to the framebuffer, so a linearised
              // texture would arrive pre-darkened with no encoding step.
              texture.anisotropy = renderer!.capabilities.getMaxAnisotropy();
              resolve(texture);
            },
            undefined,
            () => reject(new Error(file))
          );
        });

      let day: THREETypes.Texture;
      let night: THREETypes.Texture | undefined;
      let clouds: THREETypes.Texture | undefined;
      try {
        day = await load('day.webp');
        // Optional passes: if one fails the globe still renders, so each is
        // allowed to fail on its own rather than failing the whole view.
        [night, clouds] = await Promise.all([
          load('night.webp').catch(() => undefined),
          load('clouds.webp').catch(() => undefined),
        ]);
      } catch {
        if (!disposed) setStatus('failed');
        return;
      }
      if (disposed) {
        renderer.dispose();
        return;
      }

      // --- planet ----------------------------------------------------------
      // Hand-written shading rather than MeshPhongMaterial. Phong multiplies
      // the map by a cosine falloff, and NASA's ocean is already near-black, so
      // most of the disc collapsed into the plate. Here the light floor is
      // explicit: the unlit side keeps 58% of its colour, which reads as form
      // on a printed plate instead of a hole.
      const earthMaterial = new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: day },
          nightMap: { value: night ?? null },
          hasNight: { value: night ? 1 : 0 },
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vNormalView;
          void main() {
            vUv = uv;
            vNormalView = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D dayMap;
          uniform sampler2D nightMap;
          uniform float hasNight;
          varying vec2 vUv;
          varying vec3 vNormalView;
          void main() {
            vec3 day = texture2D(dayMap, vUv).rgb;

            // Lift the plate: the source ocean is almost black, and at this
            // size a faithful reproduction is just a dark disc.
            float grey = dot(day, vec3(0.299, 0.587, 0.114));
            day = mix(day, vec3(grey), 0.10);
            day = pow(day, vec3(0.55)) * 1.22;

            // Key light fixed in view space, up and to the right of the reader,
            // so shading follows the sphere as it turns without ever flipping.
            vec3 key = normalize(vec3(0.42, 0.40, 0.92));
            float lambert = clamp(dot(vNormalView, key), 0.0, 1.0);
            float shade = mix(0.58, 1.0, pow(lambert, 0.75));

            vec3 color = day * shade;

            // City lights on the side turning away from the key.
            if (hasNight > 0.5) {
              vec3 lights = texture2D(nightMap, vUv).rgb;
              float nightness = smoothstep(0.45, 0.05, lambert);
              color += lights * nightness * 0.8;
            }

            gl_FragColor = vec4(color, 1.0);
          }
        `,
      });
      const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), earthMaterial);
      globe.add(earth);

      let cloudMesh: THREETypes.Mesh | undefined;
      if (clouds) {
        cloudMesh = new THREE.Mesh(
          new THREE.SphereGeometry(1.008, 72, 72),
          new THREE.MeshLambertMaterial({
            map: clouds,
            transparent: true,
            opacity: 0.3,
            depthWrite: false,
          })
        );
        globe.add(cloudMesh);
      }

      // Atmosphere: a back-side shell that glows only near the rim, where the
      // view ray grazes the shell almost tangentially.
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.16, 72, 72),
        new THREE.ShaderMaterial({
          transparent: true,
          side: THREE.BackSide,
          depthWrite: false,
          uniforms: { glow: { value: new THREE.Color(0x7fb4e8) } },
          vertexShader: `
            varying vec3 vNormal;
            varying vec3 vView;
            void main() {
              vec4 world = modelMatrix * vec4(position, 1.0);
              vNormal = normalize(mat3(modelMatrix) * normal);
              vView = normalize(cameraPosition - world.xyz);
              gl_Position = projectionMatrix * viewMatrix * world;
            }
          `,
          fragmentShader: `
            uniform vec3 glow;
            varying vec3 vNormal;
            varying vec3 vView;
            void main() {
              float rim = 1.0 - abs(dot(vNormal, vView));
              float strength = pow(clamp(rim, 0.0, 1.0), 2.4);
              gl_FragColor = vec4(glow, strength * 0.45);
            }
          `,
        })
      );
      globe.add(atmosphere);

      // --- lights ----------------------------------------------------------
      // Only the cloud shell and pins are lit by these; the earth uses its own
      // shader. Kept soft so clouds read as a veil rather than weather.
      const sun = new THREE.DirectionalLight(0xfff6e8, 1.5);
      sun.position.set(0.5, 0.4, 1);
      scene.add(sun);
      scene.add(new THREE.AmbientLight(0xc8d6e4, 1.1));

      // --- pins ------------------------------------------------------------
      const peak = Math.max(1, ...Object.values(counts));
      const pinGroup = new THREE.Group();
      const pinGeometry = new THREE.SphereGeometry(1, 8, 8);
      for (const [country, [lat, lon]] of Object.entries(COUNTRY_COORDS)) {
        const articles = counts[country] ?? 0;
        if (articles <= 0) continue;
        const weight = Math.min(1, articles / peak);
        const pin = new THREE.Mesh(
          pinGeometry,
          new THREE.MeshBasicMaterial({
            color: weight > 0.45 ? 0xff8a5c : 0x9fc6e8,
            transparent: true,
            opacity: 0.85,
            depthWrite: false,
          })
        );
        // Same convention as SphereGeometry's own vertices, so a pin sits on
        // the coastline the texture draws beneath it.
        const theta = (90 - lat) * DEG;
        const phi = (lon + 180) * DEG;
        pin.position.set(
          -Math.sin(theta) * Math.cos(phi),
          Math.cos(theta),
          Math.sin(theta) * Math.sin(phi)
        );
        pin.position.multiplyScalar(1.004);
        pin.scale.setScalar(0.012 + weight * 0.018);
        pinGroup.add(pin);
      }
      globe.add(pinGroup);

      // --- interaction -----------------------------------------------------
      let dragging = false;
      let pointerX = 0;
      let pointerY = 0;
      let spinLon = 0;
      let spinLat = 0;
      let velocityLon = 0;
      let velocityLat = 0;
      let zoom = 0;

      const canvas = renderer.domElement;
      const onPointerDown = (event: PointerEvent) => {
        dragging = true;
        pointerX = event.clientX;
        pointerY = event.clientY;
        velocityLon = 0;
        velocityLat = 0;
        canvas.style.cursor = 'grabbing';
        canvas.setPointerCapture(event.pointerId);
      };
      const onPointerMove = (event: PointerEvent) => {
        if (!dragging) return;
        const dx = event.clientX - pointerX;
        const dy = event.clientY - pointerY;
        pointerX = event.clientX;
        pointerY = event.clientY;
        // Dragging pulls the surface with the pointer, so a rightward drag
        // must decrease the centre longitude (the features slide right) and a
        // downward drag must increase the centre latitude.
        velocityLon = -dx * 0.28;
        velocityLat = dy * 0.28;
        spinLon += velocityLon;
        spinLat += velocityLat;
      };
      const onPointerUp = () => {
        dragging = false;
        canvas.style.cursor = 'grab';
      };
      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        zoom = Math.max(-1.2, Math.min(1.1, zoom + event.deltaY * 0.0012));
      };

      canvas.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      cleanups.push(() => {
        canvas.removeEventListener('pointerdown', onPointerDown);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        canvas.removeEventListener('wheel', onWheel);
      });

      // --- loop ------------------------------------------------------------
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const clock = new THREE.Clock();

      const render = () => {
        const delta = Math.min(clock.getDelta(), 0.05);

        if (!dragging) {
          // Earth turns eastward, so the meridian under the camera drifts
          // west; a released drag keeps coasting the way it was thrown.
          spinLon += velocityLon - (reduced ? 0 : 0.09);
          spinLat += velocityLat;
          velocityLon *= 0.94;
          velocityLat *= 0.94;
        }

        // Clamp pitch so the reader cannot roll past the poles.
        spinLat = Math.max(-75, Math.min(75, spinLat));

        globe.quaternion.copy(orient(startLat + spinLat, startLon + spinLon));

        camera.position.z = 4.1 - zoom;
        camera.lookAt(0, 0, 0);

        if (cloudMesh) cloudMesh.rotation.y += delta * 0.004;
        if (!reduced) stars.rotation.y += delta * 0.0015;

        renderer!.render(scene, camera);
        frame = requestAnimationFrame(render);
      };

      const resize = () => {
        const w = mount!.clientWidth || width;
        const h = mount!.clientHeight || height;
        renderer!.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      observer = new ResizeObserver(resize);
      observer.observe(mount!);

      setStatus('ready');
      render();

      cleanups.push(() => {
        observer?.disconnect();
        earth.geometry.dispose();
        earthMaterial.dispose();
        cloudMesh?.geometry.dispose();
        const cloudMaterial = cloudMesh?.material;
        if (cloudMaterial && !Array.isArray(cloudMaterial)) cloudMaterial.dispose();
        atmosphere.geometry.dispose();
        const atmosphereMaterial = atmosphere.material;
        if (!Array.isArray(atmosphereMaterial)) atmosphereMaterial.dispose();
        pinGeometry.dispose();
        pinGroup.children.forEach((pin) => {
          const material = (pin as THREETypes.Mesh).material;
          if (!Array.isArray(material)) material.dispose();
        });
        starGeometry.dispose();
        starMaterial.dispose();
        day.dispose();
        night?.dispose();
        clouds?.dispose();
        renderer?.dispose();
        if (canvas.parentElement === mount) mount!.removeChild(canvas);
      });
    }

    boot();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      cleanups.forEach((fn) => fn());
    };
  }, [counts, focus]);

  return (
    <div className={`relative h-full w-full ${className}`}>
      <div className="relative h-full w-full overflow-hidden bg-[#1a1816]">
        <div ref={mountRef} className="h-full w-full" />
        {status === 'loading' && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-[#8fa3b8]">
              Receiving imagery
            </span>
          </div>
        )}
        {status === 'failed' && (
          <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
            <p className="text-xs leading-relaxed text-[#8fa3b8]">
              This browser could not start WebGL, so the globe is unavailable. The world desk
              below still lists every country we follow.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
