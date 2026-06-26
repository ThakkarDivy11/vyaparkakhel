'use client';
import React, { useRef, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { RoundedBox, Environment, ContactShadows } from '@react-three/drei';
import gsap from 'gsap';

const PIPS = [
  // 1: Front (+Z)
  [0, 0, 0.51],
  // 2: Top (+Y)
  [-0.25, 0.51, 0.25], [0.25, 0.51, -0.25],
  // 3: Right (+X)
  [0.51, 0.25, -0.25], [0.51, 0, 0], [0.51, -0.25, 0.25],
  // 4: Left (-X)
  [-0.51, 0.25, 0.25], [-0.51, 0.25, -0.25], [-0.51, -0.25, 0.25], [-0.51, -0.25, -0.25],
  // 5: Bottom (-Y)
  [-0.25, -0.51, 0.25], [0.25, -0.51, 0.25], [0, -0.51, 0], [-0.25, -0.51, -0.25], [0.25, -0.51, -0.25],
  // 6: Back (-Z)
  [-0.25, 0.25, -0.51], [0.25, 0.25, -0.51], [-0.25, 0, -0.51], [0.25, 0, -0.51], [-0.25, -0.25, -0.51], [0.25, -0.25, -0.51]
];

function SingleDie({ position, value, rolling }) {
  const meshRef = useRef();

  // Mapping value to a target rotation where the face points UP (+Y)
  // Or actually facing the camera? Let's make it face the camera slightly tilted.
  // If the camera is at Z=5 looking at (0,0,0), we want the target face to point +Z, but with a nice isometric tilt.
  // We can wrap the die in a group. The group handles the isometric tilt, while the die rotates inside it to point the face to +Z!
  
  const targetRotations = {
    1: { x: 0, y: 0, z: 0 },
    2: { x: Math.PI / 2, y: 0, z: 0 },
    3: { x: 0, y: -Math.PI / 2, z: 0 },
    4: { x: 0, y: Math.PI / 2, z: 0 },
    5: { x: -Math.PI / 2, y: 0, z: 0 },
    6: { x: 0, y: Math.PI, z: 0 },
  };

  const proxyRef = useRef({ rx: 0, ry: 0, rz: 0, py: 0 });

  useEffect(() => {
    if (!meshRef.current) return;
    
    const proxy = proxyRef.current;
    proxy.rx = meshRef.current.rotation.x;
    proxy.ry = meshRef.current.rotation.y;
    proxy.rz = meshRef.current.rotation.z;
    proxy.py = meshRef.current.position.y;

    gsap.killTweensOf(proxy);

    if (rolling) {
      gsap.to(proxy, {
        rx: proxy.rx + Math.PI * 6,
        ry: proxy.ry + Math.PI * 6,
        rz: proxy.rz + Math.PI * 2,
        duration: 0.7,
        ease: "power1.inOut",
        onUpdate: () => {
          if (meshRef.current) meshRef.current.rotation.set(proxy.rx, proxy.ry, proxy.rz);
        }
      });
      gsap.to(proxy, {
        py: position[1] + 1,
        duration: 0.35,
        yoyo: true,
        repeat: 1,
        ease: "power1.inOut",
        onUpdate: () => {
          if (meshRef.current) meshRef.current.position.y = proxy.py;
        }
      });
    } else if (value) {
      const target = targetRotations[value] || targetRotations[1];
      
      // Normalize current rotation so it doesn't spin wildly backwards
      proxy.rx = proxy.rx % (Math.PI * 2);
      proxy.ry = proxy.ry % (Math.PI * 2);
      proxy.rz = proxy.rz % (Math.PI * 2);
      
      // Set mesh instantly to normalized rotation before tweening to target
      if (meshRef.current) meshRef.current.rotation.set(proxy.rx, proxy.ry, proxy.rz);

      gsap.to(proxy, {
        rx: target.x,
        ry: target.y,
        rz: target.z,
        duration: 0.4,
        ease: "back.out(1.5)",
        onUpdate: () => {
          if (meshRef.current) meshRef.current.rotation.set(proxy.rx, proxy.ry, proxy.rz);
        }
      });
      gsap.to(proxy, {
        py: position[1],
        duration: 0.2,
        onUpdate: () => {
          if (meshRef.current) meshRef.current.position.y = proxy.py;
        }
      });
    }
  // Ignore position array dependency so it doesn't trigger every 70ms during re-renders!
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, rolling]);

  const pips = useMemo(() => {
    return PIPS.map((pos, i) => (
      <mesh key={i} position={pos}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.1} />
      </mesh>
    ));
  }, []);

  return (
    <group position={position}>
      {/* Isometric tilt wrapper: tilts the die so +Z faces camera but looks 3D */}
      <group rotation={[-Math.PI / 6, Math.PI / 6, 0]}>
        <mesh ref={meshRef} castShadow receiveShadow>
          <RoundedBox args={[1, 1, 1]} radius={0.15} smoothness={4}>
            <meshStandardMaterial 
              color="#FFD700" 
              metalness={0.8} 
              roughness={0.1} 
              envMapIntensity={1.5} 
            />
          </RoundedBox>
          {pips}
        </mesh>
      </group>
    </group>
  );
}

export default function GoldenDice3D({ d1, d2, rolling }) {
  return (
    <div className="w-[120px] h-[70px] cursor-pointer">
      <Canvas shadows camera={{ position: [0, 0, 5], fov: 35 }}>
        <ambientLight intensity={0.5} />
        <directionalLight 
          position={[5, 10, 5]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={1024}
        />
        <Environment preset="city" />
        
        <SingleDie position={[-0.7, 0, 0]} value={d1} rolling={rolling} />
        <SingleDie position={[0.7, 0, 0]} value={d2} rolling={rolling} />
        
        <ContactShadows 
          position={[0, -0.8, 0]} 
          opacity={0.5} 
          scale={5} 
          blur={2} 
          far={4} 
        />
      </Canvas>
    </div>
  );
}
