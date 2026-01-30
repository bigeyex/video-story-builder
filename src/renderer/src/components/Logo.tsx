import React from 'react';
import logo from '../assets/logo.png';

interface LogoProps {
    size?: number;
    showText?: boolean;
    textColor?: string;
    style?: React.CSSProperties;
}

const Logo: React.FC<LogoProps> = ({ size = 32, showText = true, textColor = '#fff', style }) => {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', ...style }}>
            <img src={logo} alt="Storyboard Maker" style={{ width: size, height: size, borderRadius: '6px' }} />
            {showText && (
                <span style={{
                    fontSize: size * 0.6,
                    fontWeight: 'bold',
                    color: textColor,
                    letterSpacing: '0.5px'
                }}>
                    Storyboard Maker
                </span>
            )}
        </div>
    );
};

export default Logo;
