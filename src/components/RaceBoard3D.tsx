import React, { Suspense, useEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Bounds, OrthographicCamera, useBounds } from "@react-three/drei";
import * as THREE from "three";
import { Horse } from "../types";

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
const laneCount = laneNumbers.length;

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

const trackWidth = 30;
const trackHeight = 16;
const boardThickness = 0.5;
const cornerRadius = 0.8;
const inset = 0.6;
const startStripWidth = 1.2;
const finishStripWidth = 1.1;
const laneHeightFactor = 0.82;
const finishLineWidth = 0.32;
const laneSpanHeight =
  ((trackHeight - inset * 2) * (laneCount - 1 + laneHeightFactor)) / laneCount;
const finishLineHeight = laneSpanHeight;
const startLineHeight = laneSpanHeight;
const finishLineSquare = 0.28;
const HORSE_SCALE = 1.28;
const lanePadding = 0.7;
const trackShorten = 0.8;
const additionalShorten = 0.6;
const halfShift = additionalShorten / 2;
const trackOffsetX = 0.6 + 0.8;
const BOARD_TOP_Y = boardThickness / 2;
const LINE_Y = BOARD_TOP_Y + 0.06;
const LANE_Y = BOARD_TOP_Y + 0.03;
const LANE_H = 0.012;
const LANE_TOP_Y = LANE_Y + LANE_H / 2;
const PEG_HOLE_H = 0.012;
const PEG_HOLE_LIFT = 0.006;
const PEG_HOLE_Y = LANE_TOP_Y + PEG_HOLE_H / 2 + PEG_HOLE_LIFT;
const laneSpacing = (trackHeight - inset * 2) / laneCount;
const trackStartX =
  -trackWidth / 2 +
  inset +
  startStripWidth +
  lanePadding +
  trackShorten / 2 +
  halfShift;
const trackEndX =
  trackWidth / 2 -
  inset -
  finishStripWidth -
  lanePadding -
  trackShorten / 2 -
  halfShift;
const trackLength = trackEndX - trackStartX;
const startLineOffset = 0.05;
const startLineX = trackStartX + startLineOffset;
const startLineWidth = 0.12;
const startLineLeftEdge = startLineX - startLineWidth / 2;
const startGateOffset = 0.05;
const startGateX = startLineLeftEdge - (0.35 + 0.08) - startGateOffset;
const finishLineX = trackEndX - 0.15;
const finishGateX = trackEndX + 0.6;
const HORSE_X_OFFSET = -0.06;

const createWoodTexture = () => {
  if (typeof document === "undefined") return new THREE.Texture();

  const canvas = document.createElement("canvas");
  const size = 1024;
  canvas.width = size;
  canvas.height = size / 2;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#d1a55b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const stripeCount = 16;
    for (let i = 0; i < stripeCount; i++) {
      const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
      const base = 0.5 + (Math.sin(i * 1.3) + 1) * 0.2;
      grad.addColorStop(0, `rgba(120,78,28,${0.18 + base * 0.1})`);
      grad.addColorStop(0.5, `rgba(230,187,116,${0.3 + base * 0.08})`);
      grad.addColorStop(1, `rgba(120,78,28,${0.18 + base * 0.1})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, (canvas.height / stripeCount) * i, canvas.width, 12);
    }

    ctx.globalAlpha = 0.25;
    ctx.fillStyle = "#e2c186";
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

const createLabelTexture = (
  text: string,
  color: string,
  fontSize: number,
  fontWeight = 700,
  strokeColor?: string,
  strokeWidth = 4
) => {
  if (typeof document === "undefined") {
    return { texture: new THREE.Texture(), aspect: 1 };
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { texture: new THREE.Texture(), aspect: 1 };

  const scale = 3;
  const scaledFontSize = fontSize * scale;
  const font =
    `${fontWeight} ${scaledFontSize}px ` +
    '"Helvetica Neue", Arial, "Segoe UI", sans-serif';
  ctx.font = font;
  const metrics = ctx.measureText(text);
  const padding = Math.ceil(scaledFontSize * 0.35);
  const width = Math.ceil(metrics.width + padding * 2);
  const height = Math.ceil(scaledFontSize + padding * 1.4);

  canvas.width = width;
  canvas.height = height;
  const ctx2 = canvas.getContext("2d");
  if (!ctx2) return { texture: new THREE.Texture(), aspect: width / height };
  ctx2.font = font;
  ctx2.textAlign = "center";
  ctx2.textBaseline = "middle";
  if (strokeColor) {
    ctx2.strokeStyle = strokeColor;
    ctx2.lineWidth = strokeWidth * scale;
    ctx2.lineJoin = "round";
    ctx2.strokeText(text, width / 2, height / 2);
  }
  ctx2.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx2.shadowBlur = 6 * scale;
  ctx2.shadowOffsetX = 0;
  ctx2.shadowOffsetY = 0;
  ctx2.fillStyle = color;
  ctx2.fillText(text, width / 2, height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.premultiplyAlpha = true;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  texture.needsUpdate = true;

  return { texture, aspect: width / height };
};

const LabelPlane: React.FC<{
  text: string;
  color: string;
  size: number;
  position: [number, number, number];
  fontSize: number;
  fontWeight?: number;
  strokeColor?: string;
  strokeWidth?: number;
  rotation?: [number, number, number];
  depthTest?: boolean;
  depthWrite?: boolean;
  renderOrder?: number;
}> = ({
  text,
  color,
  size,
  position,
  fontSize,
  fontWeight,
  strokeColor,
  strokeWidth,
  rotation = [-Math.PI / 2, 0, 0],
  depthTest = true,
  depthWrite = true,
  renderOrder,
}) => {
  const { texture, aspect } = useMemo(
    () => createLabelTexture(text, color, fontSize, fontWeight, strokeColor, strokeWidth),
    [text, color, fontSize, fontWeight, strokeColor, strokeWidth]
  );

  useEffect(() => () => texture.dispose(), [texture]);

  return (
    <mesh position={position} rotation={rotation} renderOrder={renderOrder}>
      <planeGeometry args={[size * aspect, size]} />
      <meshBasicMaterial
        map={texture}
        transparent
        toneMapped={false}
        depthTest={depthTest}
        depthWrite={depthWrite}
      />
    </mesh>
  );
};

const roundedRectShape = (width: number, height: number, radius: number) => {
  const hw = width / 2;
  const hh = height / 2;
  const r = Math.min(radius, hw, hh);
  const shape = new THREE.Shape();
  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return shape;
};

const generateLaneConfigs = (): LaneConfig[] =>
  laneNumbers.map((lane, idx) => {
    const pegCount = pegDistribution[lane];
    const pegPositions = Array.from({ length: pegCount }, (_, pegIdx) => {
      // Space pegs away from the start/finish strips; no holes at the edges.
      const fraction = (pegIdx + 1) / (pegCount + 1);
      return trackStartX + fraction * trackLength;
    });
    const centerZ = -trackHeight / 2 + inset + laneSpacing * (idx + 0.5);
    return { lane, centerZ, pegPositions };
  });

const HorseToken: React.FC<{
  horse: DisplayHorse;
  targetX: number;
  laneZ: number;
  yOverride?: number;
}> = ({ horse, targetX, laneZ, yOverride }) => {
  const accent = lighten(horse.palette, 0.25);
  const baseHalfHeight = 0.35 / 2;
  const baseY =
    BOARD_TOP_Y + (yOverride ?? 0.22) + baseHalfHeight * (HORSE_SCALE - 1);

  return (
    <group position={[targetX, baseY, laneZ]} scale={[HORSE_SCALE, HORSE_SCALE, HORSE_SCALE]}>
      <mesh renderOrder={50}>
        <cylinderGeometry args={[0.3, 0.35, 0.35, 32]} />
        <meshStandardMaterial color={accent} metalness={0.15} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.3, 0]} renderOrder={50}>
        <sphereGeometry args={[0.22, 32, 24]} />
        <meshStandardMaterial color={horse.palette} />
      </mesh>
      <LabelPlane
        text={`${horse.number}`}
        color="#0b0b0b"
        size={0.56}
        fontSize={172}
        fontWeight={950}
        strokeColor="#f8fafc"
        strokeWidth={8}
        position={[0, 0.55, 0]}
      />
    </group>
  );
};

const PegHole: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, PEG_HOLE_Y, z]}>
    <mesh>
      <cylinderGeometry args={[0.23, 0.23, PEG_HOLE_H, 32]} />
      <meshStandardMaterial
        color="#3a2212"
        roughness={0.85}
        metalness={0.08}
        polygonOffset
        polygonOffsetFactor={-2}
        polygonOffsetUnits={-2}
      />
    </mesh>
  </group>
);

const BoardScene: React.FC<{
  woodTexture: THREE.Texture;
  laneConfigs: LaneConfig[];
  horses: DisplayHorse[];
}> = ({ woodTexture, laneConfigs, horses }) => {
  const { size } = useThree();
  const showLaneNumbers = size.width < 768;
  const scratchColSpacing = 0.55 * 1.25 * 1.17; // widened base by 25%, then +17%
  const scratchToStartGap = 0.35;
  const scratchRightEdgeX = startLineX + startLineWidth / 2 - scratchToStartGap;
  const scratchColumnXs = [
    scratchRightEdgeX - 3 * scratchColSpacing,
    scratchRightEdgeX - 2 * scratchColSpacing,
    scratchRightEdgeX - scratchColSpacing,
    scratchRightEdgeX,
  ];

  return (
  <group scale={[0.95, 1, 1]}>
    {/* Rounded rectangle base */}
    <mesh
      position={[0, -boardThickness / 2, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      castShadow
      receiveShadow
    >
      <extrudeGeometry
        args={[
          roundedRectShape(trackWidth, trackHeight, cornerRadius),
          { depth: boardThickness, bevelEnabled: false },
        ]}
      />
      <meshStandardMaterial
        map={woodTexture}
        color="#d7b06d"
        roughness={0.68}
        metalness={0.12}
      />
    </mesh>

    <group position={[trackOffsetX, 0, 0]}>
      {/* Start line */}
      <mesh position={[startLineX, LINE_Y, 0]}>
        <boxGeometry args={[startLineWidth, 0.012, startLineHeight]} />
        <meshStandardMaterial color="#111111" />
      </mesh>

      {/* Finish line (checkered) */}
      {(() => {
        const cols = Math.max(2, Math.round(finishLineWidth / finishLineSquare));
        const rows = Math.max(2, Math.round(finishLineHeight / finishLineSquare));
        const squareW = finishLineWidth / cols;
        const squareH = finishLineHeight / rows;
        const startX = finishLineX - finishLineWidth / 2 + squareW / 2;
        const startZ = -finishLineHeight / 2 + squareH / 2;

        return (
          <group>
            {Array.from({ length: rows }).map((_, row) =>
              Array.from({ length: cols }).map((_, col) => {
                const isDark = (row + col) % 2 === 0;
                return (
                  <mesh
                    key={`finish-check-${row}-${col}`}
                    position={[
                      startX + col * squareW,
                      LINE_Y,
                      startZ + row * squareH,
                    ]}
                  >
                    <boxGeometry args={[squareW, 0.012, squareH]} />
                    <meshStandardMaterial
                      color={isDark ? "#111111" : "#f8fafc"}
                      roughness={0.35}
                      metalness={0.05}
                    />
                  </mesh>
                );
              })
            )}
          </group>
        );
      })()}

      {/* Lanes and Pegs */}
      {laneConfigs.map((lane, laneIdx) => (
        <group key={`lane-${lane.lane}`}>
          <mesh
            position={[(trackStartX + trackEndX) / 2, LANE_Y, lane.centerZ]}
            receiveShadow
            castShadow
          >
            <boxGeometry args={[trackLength, LANE_H, laneSpacing * laneHeightFactor]} />
            <meshStandardMaterial color={lighten("#8b5a2b", 0.2 + laneIdx * 0.01)} />
          </mesh>
          {showLaneNumbers && (
            <LabelPlane
              text={`${lane.lane}`}
              color="#000000"
              size={1.14}
              fontSize={480}
              fontWeight={900}
              strokeColor="#f8fafc"
              strokeWidth={6}
              position={[startLineX + 0.84, BOARD_TOP_Y + 0.1, lane.centerZ]}
            />
          )}
          {lane.pegPositions.map((pegX, pegIdx) => (
            <PegHole key={`peg-${lane.lane}-${pegIdx}`} x={pegX} z={lane.centerZ} />
          ))}
        </group>
      ))}

      {/* Horizontal lane separators */}
      {laneConfigs.slice(0, laneConfigs.length - 1).map((lane, i) => {
        const nextLane = laneConfigs[i + 1];
        const separatorZ = (lane.centerZ + nextLane.centerZ) / 2;
        const xLeft = startLineX + startLineWidth / 2;
        const xRight = finishLineX - finishLineWidth / 2;
        const separatorCenterX = (xLeft + xRight) / 2;
        const separatorLength = xRight - xLeft;

        return (
          <mesh key={`lane-sep-${i}`} position={[separatorCenterX, LINE_Y, separatorZ]}>
            <boxGeometry args={[separatorLength, 0.01, 0.035]} />
            <meshStandardMaterial color="#111111" />
          </mesh>
        );
      })}

      {/* Winner marker */}
      <group position={[finishGateX, PEG_HOLE_Y, 0]}>
        <mesh>
          <cylinderGeometry args={[0.4, 0.4, 0.05, 40]} />
          <meshStandardMaterial color="#3a2a12" roughness={0.55} />
        </mesh>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.3, 0.3, 0.05, 40]} />
          <meshStandardMaterial color="#facc15" metalness={0.65} roughness={0.25} />
        </mesh>
      </group>

      {/* Horses */}
      {horses.map((horse) => {
        const lane = laneConfigs[horse.laneIndex];
        const pegPositions = lane.pegPositions;
        let targetX = startGateX;

        if (horse.scratched) {
          const clampedStep = Math.min(4, Math.max(1, horse.scratchStep ?? 1));
          const scratchIndex = 4 - clampedStep; // 1->3,2->2,3->1,4->0
          targetX = scratchColumnXs[scratchIndex] - trackOffsetX;
        } else if ((horse.position ?? 0) <= 0) {
          targetX = startGateX;
        } else if (horse.position > pegPositions.length) {
          targetX = finishGateX;
        } else {
          const pegIndex = Math.min(
            pegPositions.length - 1,
            Math.max(Math.floor(horse.position) - 1, 0)
          );
          targetX = pegPositions[pegIndex];
        }

        const isWinnerSpot =
          !horse.scratched && (horse.position ?? 0) > pegPositions.length;
        const horseOffsetX = isWinnerSpot ? 0 : HORSE_X_OFFSET;
        const horseZ = isWinnerSpot ? 0 : lane.centerZ;

        return (
          <HorseToken
            key={`horse-${horse.number}`}
            horse={horse}
            targetX={targetX + horseOffsetX}
            laneZ={horseZ}
            yOverride={horse.scratched ? 0.18 : undefined}
          />
        );
      })}
    </group>

    {/* Scratch grid (4 columns x 11 rows) */}
    {(() => {
      const headerZ =
        laneConfigs.length > 0
          ? laneConfigs[0].centerZ - laneSpacing * 0.65
          : 0;
      const bottomLabelZ =
        laneConfigs.length > 0
          ? laneConfigs[laneConfigs.length - 1].centerZ + laneSpacing * 0.65
          : 0;
      const dollarLabelY = BOARD_TOP_Y + 0.11;
      const headerY = BOARD_TOP_Y + 0.18;
      const labels = ["$20", "$15", "$10", "$5"];
      const scratchCenterX = (scratchColumnXs[0] + scratchColumnXs[3]) / 2;

      return (
        <>
          <LabelPlane
            text="SCRATCHED"
            color="#f8fafc"
            size={0.52}
            fontSize={120}
            position={[scratchCenterX, headerY, headerZ]}
            depthTest={false}
            depthWrite={false}
            renderOrder={2500}
          />
          {labels.map((label, idx) => (
            <LabelPlane
              key={`scratch-label-${label}`}
              text={label}
              color="#f8fafc"
              size={0.5}
              fontSize={122}
              position={[scratchColumnXs[idx], dollarLabelY, bottomLabelZ]}
              depthTest={false}
              depthWrite={false}
              renderOrder={2500}
            />
          ))}

          {laneConfigs.map((lane, laneIdx) =>
            scratchColumnXs.map((x, colIdx) => (
              <PegHole key={`scratch-peg-${laneIdx}-${colIdx}`} x={x} z={lane.centerZ} />
            ))
          )}
        </>
      );
    })()}
  </group>
);

};

const BoundsFit: React.FC = () => {
  const bounds = useBounds();
  const { size } = useThree();

  useEffect(() => {
    bounds.refresh().fit();
  }, [bounds, size.width, size.height]);

  return null;
};

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
    <div className="w-full h-full flex justify-center items-center">
      <div
        className="w-full h-full"
        style={{
          maxWidth: "min(100%, 1600px)",
          maxHeight: "var(--board-max-height, 100%)",
          overflow: "hidden",
        }}
      >
        <Canvas
          shadows
          dpr={[1, 1.5]}
          gl={{ alpha: true }}
          onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        >
          <ambientLight intensity={0.55} />
          <directionalLight
            castShadow
            position={[18, 24, 12]}
            intensity={1.05}
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <OrthographicCamera
            makeDefault
            position={[0, 18, 0]}
            rotation={[-Math.PI / 2, 0, 0]}
            zoom={32.2}
            near={0.1}
            far={100}
          />
          <Suspense fallback={null}>
            <Bounds fit clip observe={false} margin={1.05}>
              <BoundsFit />
              <BoardScene
                woodTexture={woodTexture}
                laneConfigs={laneConfigs}
                horses={horsesForDisplay}
              />
            </Bounds>
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
};

export default RaceBoard3D;
