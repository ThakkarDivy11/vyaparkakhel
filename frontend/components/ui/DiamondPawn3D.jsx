'use client';
import React, { useRef, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, Float, Sparkles, Octahedron } from '@react-three/drei';
import gsap from 'gsap';

function DiamondMesh({ color }) {
  const meshRef = useRef();

  useEffect(() => {
    if (!meshRef.current) return;
    
    // Continuous rotation using GSAP
    const ctx = gsap.context(() => {
      gsap.to(meshRef.current.rotation, {
        y: Math.PI * 2,
        duration: 4,
        repeat: -1,
        ease: "none",
        onUpdate: () => {
          // In case we want to hook anything up later
        }
      });
      
      // Floating bounce effect (along with React Three Drei's Float)
      gsap.to(meshRef.current.position, {
        y: 0.1,
        duration: 1.5,
        yoyo: true,
        repeat: -1,
        ease: "power1.inOut"
      });
    });

    return () => ctx.revert(); // Cleanup GSAP tweens
  }, []);

  return (
    <group>
      <Octahedron ref={meshRef} args={[1, 0]} scale={[0.8, 1.2, 0.8]}>
        {/* Diamond Material */}
        <meshPhysicalMaterial
          color={color || "#ffffff"}
          transmission={1}
          opacity={1}
          metalness={0}
          roughness={0}
          ior={2.4}
          thickness={0.5}
          clearcoat={1}
          clearcoatRoughness={0.1}
          envMapIntensity={2}
        />
      </Octahedron>
      <Sparkles count={15} scale={1.5} size={2} speed={0.4} color={color || "#ffffff"} />
    </group>
  );
}

export default function DiamondPawn3D({ color, className }) {
  return (
    <div className={className} style={{ width: '100%', height: '100%', minWidth: '24px', minHeight: '24px' }}>
      <Canvas camera={{ position: [0, 0, 3], fov: 40 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[5, 10, 5]} intensity={2} penumbra={1} />
        <Environment preset="studio" />
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
          <DiamondMesh color={color} />
        </Float>
      </Canvas>
    </div>
  );
}
