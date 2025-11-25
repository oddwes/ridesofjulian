const Footer = ({ text, url }) => {
  const footerText = url ? (
    <a target="_blank" rel="noopener noreferrer" href={url}>
      {text}
    </a>
  ) : (
    text
  );

  return (
    <div className="border-t border-gray-200 mt-8 pt-4">
      <p className="text-center text-gray-600">{footerText}</p>
    </div>
  );
};

export default Footer;
