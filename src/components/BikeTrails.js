import React, { useEffect, useRef, useState } from 'react';
import '../styling/BikeTrails.css';  // Add custom styles for animation here

export const BikeTrails = () => {
  const [scrollPosition, setScrollPosition] = useState(0);
  const [pageHeight, setPageHeight] = useState(window.innerHeight);
  const [trail, setTrail] = useState([]);

  const handleScroll = () => {
    const position = window.scrollY;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    setScrollPosition(position / docHeight); // Normalize the scroll position (0 to 1)
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    setTrail((prevTrail) => [
      ...prevTrail,
      (
        <div
          key={prevTrail.length}
          className="trail"
          style={{
            top: bikePositionY,
            transform: `translate(${zigzagX}px)`
          }}
        />
      )
    ]);
  }, [scrollPosition])

  // Calculate zigzag effect and vertical position based on scroll
  const zigzagX = Math.sin(scrollPosition * 20) * 300; // Adjust the zigzag intensity
  const bikePositionY = scrollPosition * (pageHeight - 100); // Adjust the vertical position

  return (
    <div className="trail-container">
      <div
        className="bike"
        style={{
          transform: `translate(${zigzagX}px, ${bikePositionY}px)`,
        }}
      >
        🚲
      </div>
      {trail.map((pos) => pos)}
    </div>
  );
};
