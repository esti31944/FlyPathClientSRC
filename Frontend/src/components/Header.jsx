import React from 'react';
import logo from '../img/logo_flyPath.png'

const Header = () => {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    
      background: 'linear-gradient(90deg, white, #22D1F2, #0A739D)',
      padding: '10px 20px',
      color: 'white'
    }}>
        <img src={logo} alt="FlyPath Logo" style={{ height: '80px' }}/>
     
      <nav>
        {/* כאן אפשר להוסיף כפתורי ניווט בעתיד */}
      </nav>
    </header>
  );
};

export default Header;
