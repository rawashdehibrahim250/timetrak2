import React from 'react';
import { Paper, Typography, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'blue' | 'green' | 'purple' | 'orange';
  onClick?: () => void;
}

// Define color mappings for different card types
const colorMappings = {
  blue: {
    main: '#0B93F6',
    light: 'rgba(11, 147, 246, 0.2)',
    glow: 'rgba(11, 147, 246, 0.6)'
  },
  green: {
    main: '#10B981',
    light: 'rgba(16, 185, 129, 0.2)',
    glow: 'rgba(16, 185, 129, 0.6)'
  },
  purple: {
    main: '#8B5CF6',
    light: 'rgba(139, 92, 246, 0.2)',
    glow: 'rgba(139, 92, 246, 0.6)'
  },
  orange: {
    main: '#F59E0B',
    light: 'rgba(245, 158, 11, 0.2)',
    glow: 'rgba(245, 158, 11, 0.6)'
  }
};

// Styled Paper component with 3D depth and neon glow
const StyledCard = styled(Paper, {
  shouldForwardProp: (prop) => prop !== 'color' && prop !== 'isHovered'
})<{ color: 'blue' | 'green' | 'purple' | 'orange'; isHovered: boolean }>(({ theme, color, isHovered }) => ({
  background: `linear-gradient(135deg, rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.1))`,
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  borderRadius: '15px',
  padding: '20px',
  color: theme.palette.mode === 'dark' ? '#fff' : '#333',
  fontWeight: 'bold',
  boxShadow: isHovered
    ? `0 10px 20px ${colorMappings[color].glow}, 0 6px 6px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.4)`
    : `inset 0 1px 0 rgba(255, 255, 255, 0.4), 0 4px 10px rgba(0, 0, 0, 0.2)`,
  transition: 'all 0.3s ease-in-out',
  position: 'relative',
  transform: isHovered ? 'translateY(-5px)' : 'translateY(0)',
  border: `1px solid rgba(255, 255, 255, 0.2)`,
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: `linear-gradient(90deg, transparent, ${colorMappings[color].main}, transparent)`,
    opacity: isHovered ? 1 : 0.5,
    transition: 'opacity 0.3s ease-in-out',
  },
  '&::after': {
    content: '""',
    position: 'absolute',
    bottom: 0,
    left: '-100%',
    width: '200%',
    height: '1px',
    background: `linear-gradient(90deg, transparent, ${colorMappings[color].main}, transparent)`,
    transition: 'transform 0.5s ease-in-out',
    transform: isHovered ? 'translateX(50%)' : 'translateX(0)',
  }
}));

// Styled icon container with glow effect
const IconContainer = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'color' && prop !== 'isHovered'
})<{ color: 'blue' | 'green' | 'purple' | 'orange'; isHovered: boolean }>(({ color, isHovered }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '40px',
  height: '40px',
  borderRadius: '50%',
  background: colorMappings[color].light,
  color: colorMappings[color].main,
  transition: 'all 0.3s ease-in-out',
  boxShadow: isHovered ? `0 0 15px ${colorMappings[color].glow}` : 'none',
  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
}));

export default function KpiCard({ title, value, icon, trend, color, onClick }: KpiCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <StyledCard 
      color={color} 
      isHovered={isHovered}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      sx={{ cursor: onClick ? 'pointer' : 'default' }}
      elevation={0}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ 
          opacity: 0.8, 
          fontWeight: 500,
          color: colorMappings[color].main,
          transition: 'all 0.3s ease-in-out',
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        }}>
          {title}
        </Typography>
        <IconContainer color={color} isHovered={isHovered}>
          {icon}
        </IconContainer>
      </Box>
      
      <Typography variant="h4" sx={{ 
        fontWeight: 700, 
        mb: 1,
        transition: 'all 0.3s ease-in-out',
        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
        color: colorMappings[color].main,
        textShadow: isHovered ? `0 0 8px ${colorMappings[color].glow}` : 'none',
      }}>
        {value}
      </Typography>
      
      {trend && (
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: trend.isPositive ? '#10B981' : '#EF4444',
              fontWeight: 600,
              mr: 0.5
            }}
          >
            {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            vs last period
          </Typography>
        </Box>
      )}
      
      {onClick && (
        <Box 
          sx={{ 
            mt: 2, 
            display: 'flex', 
            justifyContent: 'flex-end', 
            alignItems: 'center',
            fontSize: '0.75rem',
            fontWeight: 500,
            color: colorMappings[color].main,
            opacity: isHovered ? 1 : 0.7,
            transition: 'all 0.3s ease-in-out',
          }}
        >
          View Details
          <svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
          </svg>
        </Box>
      )}
    </StyledCard>
  );
} 