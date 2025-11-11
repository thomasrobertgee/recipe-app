// src/components/Footer.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-links">
          <Link to="/portal/signup">For Suppliers</Link>
          {/* We can add more links here later, like 'About', 'Contact', 'Privacy Policy' */}
        </div>
        <div className="footer-copyright">
          © {new Date().getFullYear()} The Local Catalogue. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;