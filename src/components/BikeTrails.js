import React, { useEffect, useRef, useState } from 'react';
import '../styling/BikeTrails.css';  // Add custom styles for animation here

export const BikeTrails = () => {
  const pageHeight = window.innerHeight
  const [scrollPosition, setScrollPosition] = useState(0);
  const [trail, setTrail] = useState([]);

  const bikePositionX = (position) => Math.sin(position * 20) * 300
  const bikePositionY = (position) => position * (pageHeight)

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
            top: bikePositionY(scrollPosition),
            transform: `translate(${bikePositionX(scrollPosition)}px)`
          }}
        />
      )
    ]);
  }, [scrollPosition])

  return (
    <div className="trail-container">
      <div
        className="bike"
        style={{
          transform: `translate(${bikePositionX(scrollPosition)}px, ${bikePositionY(scrollPosition)}px)`,
        }}
      >
        🚲
      </div>
      {trail.map((pos) => pos)}
    </div>
  );
};
