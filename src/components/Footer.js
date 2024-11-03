import '../styling/footer.css';

import { useState } from 'react';

const Footer = ({ text, url }) => {
  const [footerText] = useState(
    url ? (
      <a target="_blank" rel="noopener noreferrer" href={url}>
        {text}
      </a>
    ) : (
      text
    )
  );

  return (
    <div className="footer">
      <hr />
      <p style={{ textAlign: 'center' }}>{footerText}</p>
    </div>
  );
};

export default Footer;
