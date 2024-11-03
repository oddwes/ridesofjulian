import { useEffect, useState } from 'react';
import '../styling/BikeTrails.css'; // Add custom styles for animation here

export const BikeTrails = () => {
  const getScrollPosition = () => {
    const position = window.scrollY;
    const docHeight = document.body.scrollHeight - window.innerHeight;
    return position / docHeight; // Normalize the scroll position (0 to 1)
  };

  const pageHeight = window.innerHeight;
  const [prevScrollPosition, setPrevScrollPosition] = useState({ x: window.innerWidth / 2, y: 0 });
  const [scrollPosition, setScrollPosition] = useState(getScrollPosition());
  const [trail, setTrail] = useState([]);

  const bikePositionX = (position) => Math.sin(position * 20) * 300;
  const bikePositionY = (position) => position * pageHeight;

  useEffect(() => {
    const handleScroll = () => {
      setScrollPosition(getScrollPosition());
    };
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  useEffect(() => {
    const bikePosition = document.getElementById('bike').getBoundingClientRect();
    setTrail((prevTrail) => [
      ...prevTrail,
      <svg
        className="line"
        height="100%"
        width="100%"
        key={prevTrail.length}
        xmlns="http://www.w3.org/2000/svg"
      >
        <line
          x1={prevScrollPosition.x}
          y1={prevScrollPosition.y}
          x2={bikePosition.x}
          y2={bikePosition.y}
        />
      </svg>
    ]);
    setPrevScrollPosition({ x: bikePosition.x, y: bikePosition.y });
  }, [scrollPosition, prevScrollPosition]);

  return (
    <div className="trail-container">
      <div
        id="bike"
        className="bike"
        style={{
          transform: `translate(${bikePositionX(scrollPosition)}px, ${bikePositionY(scrollPosition)}px)`
        }}
      >
        🚲
      </div>
      {trail.map((pos) => pos)}
    </div>
  );
};
