import React, { ReactNode } from 'react';

interface TimelineProps {
  children: ReactNode;
  className?: string;
}

export const Timeline: React.FC<TimelineProps> = ({ children, className = '' }) => {
  return (
    <div className={`timeline-container ${className}`}>
      {children}
    </div>
  );
};

interface TimelineItemProps {
  children: ReactNode;
  className?: string;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ children, className = '' }) => {
  return (
    <div className={`timeline-item ${className}`}>
      {children}
    </div>
  );
};

interface TimelineSeparatorProps {
  children: ReactNode;
  className?: string;
}

export const TimelineSeparator: React.FC<TimelineSeparatorProps> = ({ children, className = '' }) => {
  return (
    <div className={`timeline-separator ${className}`}>
      {children}
    </div>
  );
};

interface TimelineDotProps {
  className?: string;
  variant?: 'sent' | 'received';
}

export const TimelineDot: React.FC<TimelineDotProps> = ({ className = '', variant = 'received' }) => {
  return (
    <div className={`timeline-dot rounded-full ${variant} ${className}`}></div>
  );
};

interface TimelineConnectorProps {
  className?: string;
}

export const TimelineConnector: React.FC<TimelineConnectorProps> = ({ className = '' }) => {
  return (
    <div className={`timeline-connector ${className}`}></div>
  );
};

interface TimelineContentProps {
  children: ReactNode;
  className?: string;
}

export const TimelineContent: React.FC<TimelineContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`timeline-content ${className}`}>
      {children}
    </div>
  );
};

interface TimelineOppositeContentProps {
  children: ReactNode;
  className?: string;
}

export const TimelineOppositeContent: React.FC<TimelineOppositeContentProps> = ({ children, className = '' }) => {
  return (
    <div className={`timeline-opposite-content ${className}`}>
      {children}
    </div>
  );
}; 