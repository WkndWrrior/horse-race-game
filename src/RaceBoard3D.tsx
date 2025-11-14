import React, { Suspense, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, OrthographicCamera, Text } from "@react-three/drei";
import * as THREE from "three";
import { Horse } from "./types";

interface RaceBoard3DProps {
  horses?: Horse[];
}

interface LaneConfig {
  lane: number;
  centerZ: number;
  pegPositions: number[];
}

interface DisplayHorse extends Horse {
  palette: string;
  laneIndex: number;
}

const laneNumbers = Array.from({ length: 11 }, (_, idx) => idx + 2);

const pegDistribution: Record<number, number> = {
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 6,
  9: 5,
  10: 4,
  11: 3,
  12: 2,
};

const horsePalette = [
  "#f97316",
  "#16a34a",
  "#2563eb",
  "#7c3aed",
  "#ec4899",
  "#f59e0b",
  "#22d3ee",
  "#f43f5e",
  "#14b8a6",
  "#fbbf24",
  "#38bdf8",
];

const boardLength = 24;
const boardDepth = 14;
const boardThickness = 0.5;
const startStripWidth = 1.2;
const finishStripWidth = 1.1;
const lanePadding = 0.7;
const laneCount = laneNumbers.length;
const laneSpacing = boardDepth / laneCount;
const startStripCenterX = -boardLength / 2 + startStripWidth / 2;
const finishStripCenterX = boardLength / 2 - finishStripWidth / 2;
const trackStartX = -boardLength / 2 + startStripWidth + lanePadding;
const trackEndX = boardLength / 2 - finishStripWidth - lanePadding;
const trackLength = trackEndX - trackStartX;
const startGateX = trackStartX - 0.6;
const finishGateX = trackEndX + 0.4;

// ✅ CameraRig (Fixed)
const CameraRig: React.FC = () => {
  const { camera, size } = useThree();

  useEffect(() => {
    const aspect = size.width / size.height;
    const zoom = Math.min(48, Math.max(30, 36 * aspect));

    const orthoCam = camera as THREE.OrthographicCamera;
    orthoCam.position.set(0, 25, 0.01);
    orthoCam.up.set(0, 0, -1);
    orthoCam.lookAt(0, 0, 0);
    orthoCam.zoom = zoom;
    orthoCam.updateProjectionMatrix();
  }, [camera, size.height, size.width]);

  return null;
};

const createWoodTexture = () => {
  if (typeof document === "undefined") return new THREE.Texture();

  const canvas = document.createElement("canvas");
  const size = 1024;
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#b8874c";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const stripeCount = 16;
    for (let i = 0; i < stripeCount; i++) {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
      const base = 0.5 + (Math.sin(i * 1.3) + 1) * 0.2;
      grad.addColorStop(0, `rgba(74,38,12,${0.18 + base * 0.1})`);
      grad.addColorStop(0.5, `rgba(196,142,82,${0.28 + base * 0.08})`);
      grad.addColorStop(1, `rgba(74,38,12,${0.18 + base * 0.1})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, (canvas.height / stripeCount) * i, canvas.width, 12);
    }

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#d8b786";
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const w = 60 + Math.random() * 120;
      const h = 6 + Math.random() * 8;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2);
  texture.anisotropy = 8;
  return texture;
};

const lighten = (color: string, amount: number) => {
  const c = new THREE.Color(color);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  const next = new THREE.Color();
  next.setHSL(hsl.h, hsl.s, Math.min(1, hsl.l + amount));
  return `#${next.getHexString()}`;
};

const generateLaneConfigs = (): LaneConfig[] =>
  laneNumbers.map((lane, idx) => {
    const pegCount = pegDistribution[lane];
    const pegPositions = Array.from({ length: pegCount }, (_, pegIdx) => {
      if (pegCount === 1) return trackStartX + trackLength / 2;
      const fraction = pegIdx / (pegCount - 1);
      return trackStartX + fraction * trackLength;
    });
    const centerZ = -boardDepth / 2 + laneSpacing * (idx + 0.5);
    return { lane, centerZ, pegPositions };
  });

const HorseToken: React.FC<{
  horse: DisplayHorse;
  targetX: number;
  laneZ: number;
}> = ({ horse, targetX, laneZ }) => {
  const accent = lighten(horse.palette, 0.25);

  return (
    <group position={[targetX, 0.22, laneZ]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[0.3, 0.35, 0.35, 32]} />
        <meshStandardMaterial color={accent} metalness={0.15} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.22, 32, 24]} />
        <meshStandardMaterial color={horse.palette} />
      </mesh>
      <Text
        position={[0, 0.55, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.28}
        color="#1f2937"
        anchorX="center"
        anchorY="middle"
      >
        {horse.number}
      </Text>
    </group>
  );
};

const BoardScene: React.FC<{
  woodTexture: THREE.Texture;
  laneConfigs: LaneConfig[];
  horses: DisplayHorse[];
}> = ({ woodTexture, laneConfigs, horses }) => (
  <group>
    <mesh position={[0, -boardThickness / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[boardLength, boardThickness, boardDepth]} />
      <meshStandardMaterial
        map={woodTexture}
        color="#caa36b"
        roughness={0.75}
        metalness={0.1}
      />
    </mesh>

    {/* Start strip */}
    <mesh position={[startStripCenterX, 0.01, 0]} receiveShadow>
      <boxGeometry args={[startStripWidth, 0.02, boardDepth * 0.92]} />
      <meshStandardMaterial color="#1f2937" roughness={0.35} metalness={0.1} />
    </mesh>
    <Text
      position={[startStripCenterX, 0.03, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={0.7}
      color="#f9fafb"
      anchorX="center"
      anchorY="middle"
    >
      START
    </Text>

    {/* Finish strip */}
    <mesh position={[finishStripCenterX, 0.011, 0]} receiveShadow>
      <boxGeometry args={[finishStripWidth, 0.025, boardDepth * 0.92]} />
      <meshStandardMaterial color="#fee440" roughness={0.25} metalness={0.3} />
    </mesh>
    <Text
      position={[finishStripCenterX, 0.03, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      fontSize={0.7}
      color="#1f2937"
      anchorX="center"
      anchorY="middle"
    >
      FINISH
    </Text>

    {/* Lanes and Pegs */}
    {laneConfigs.map((lane, idx) => {
      const surfaceColor = lighten("#a56c37", idx * 0.015);
      const laneCenterX = (trackStartX + trackEndX) / 2;
      const laneLength = trackLength;

      return (
        <group key={`lane-${lane.lane}`}>
          <mesh
            position={[laneCenterX, 0.015, lane.centerZ]}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[laneLength, 0.012, laneSpacing * 0.82]} />
            <meshStandardMaterial color={surfaceColor} />
          </mesh>

          <Text
            position={[startStripCenterX - 0.75, 0.05, lane.centerZ]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.45}
            color="#1f1b13"
            anchorX="center"
            anchorY="middle"
          >
            {lane.lane}
          </Text>

          {lane.pegPositions.map((pegX, pegIdx) => (
            <group key={`peg-${lane.lane}-${pegIdx}`} position={[pegX, 0, lane.centerZ]}>
              <mesh position={[0, -0.015, 0]} receiveShadow>
                <cylinderGeometry args={[0.17, 0.17, 0.06, 32]} />
                <meshStandardMaterial color="#392311" />
              </mesh>
            </group>
          ))}
        </group>
      );
    })}

    {/* Horses */}
    {horses.map((horse) => {
      const lane = laneConfigs[horse.laneIndex];
      const pegPositions = lane.pegPositions;
      let targetX = startGateX;

      if (horse.scratched) {
        const step = horse.scratchStep ?? 1;
        targetX = startStripCenterX - startStripWidth / 2 - 0.5 * step;
      } else if ((horse.position ?? 0) <= 0) {
        targetX = startGateX;
      } else if (horse.position >= pegPositions.length) {
        targetX = finishGateX;
      } else {
        const pegIndex = Math.min(
          pegPositions.length - 1,
          Math.max(Math.floor(horse.position) - 1, 0)
        );
        targetX = pegPositions[pegIndex];
      }

      return (
        <HorseToken
          key={`horse-${horse.number}`}
          horse={horse}
          targetX={targetX}
          laneZ={lane.centerZ}
        />
      );
    })}
  </group>
);

const RaceBoard3D: React.FC<RaceBoard3DProps> = ({ horses }) => {
  const woodTexture = useMemo(() => createWoodTexture(), []);
  const laneConfigs = useMemo(() => generateLaneConfigs(), []);

  useEffect(() => () => woodTexture.dispose(), [woodTexture]);

  const horsesForDisplay = useMemo<DisplayHorse[]>(() =>
    laneNumbers.map((lane, idx) => {
      const h = horses?.find((x) => x.number === lane);
      return {
        number: lane,
        position: h?.position ?? 0,
        scratched: h?.scratched,
        scratchStep: h?.scratchStep,
        palette: horsePalette[idx % horsePalette.length],
        laneIndex: idx,
      };
    }), [horses]);

  return (
    <div className="w-full flex justify-center py-8">
      <div style={{ width: "min(95vw, 1100px)", aspectRatio: "3 / 2", maxHeight: "80vh" }}>
        <Canvas shadows dpr={[1, 2]}>
          <color attach="background" args={["#16100a"]} />
          <ambientLight intensity={0.55} />
          <directionalLight
            castShadow
            position={[18, 24, 12]}
            intensity={1.05}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <OrthographicCamera makeDefault position={[0, 25, 0.01]} near={0.1} far={100} />
          <CameraRig />
          <Suspense fallback={null}>
            <BoardScene woodTexture={woodTexture} laneConfigs={laneConfigs} horses={horsesForDisplay} />
          </Suspense>
          <ContactShadows position={[0, -boardThickness / 2 - 0.02, 0]} opacity={0.45} scale={40} blur={3.2} far={30} />
        </Canvas>
      </div>
    </div>
  );
};

export default RaceBoard3D;
