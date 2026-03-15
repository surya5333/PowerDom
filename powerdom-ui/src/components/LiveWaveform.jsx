import React from 'react';
import styled from 'styled-components';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { MdGraphicEq } from 'react-icons/md';

const ChartContainer = styled.div`
  background: #0a0f18; /* Deep oscilloscope black */
  border: 1px solid #1a2a44;
  border-radius: 16px;
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 1px,
      rgba(0, 255, 255, 0.03) 1px,
      rgba(0, 255, 255, 0.03) 2px
    );
    pointer-events: none;
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  z-index: 1;
`;

const Title = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  color: #4fd1c5;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 2px;
`;

const LiveBadge = styled.div`
  background: rgba(79, 209, 197, 0.1);
  color: #4fd1c5;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 5px;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    background: #4fd1c5;
    border-radius: 50%;
    animation: blink 1s infinite;
  }

  @keyframes blink {
    0% { opacity: 1; }
    50% { opacity: 0.3; }
    100% { opacity: 1; }
  }
`;

const LiveWaveform = ({ data }) => {
  return (
    <ChartContainer>
      <Header>
        <Title>
          <MdGraphicEq size={18} />
          High-Frequency Load Waveform
        </Title>
        <LiveBadge>LIVE STREAM</LiveBadge>
      </Header>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="waveGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4fd1c5" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#4fd1c5" stopOpacity={0}/>
            </linearGradient>
          </defs>
          
          <CartesianGrid 
            strokeDasharray="0" 
            stroke="rgba(79, 209, 197, 0.05)" 
            vertical={true} 
          />
          
          <XAxis dataKey="time" hide={true} />
          <YAxis 
            stroke="#2d3748" 
            fontSize={10} 
            tickFormatter={(val) => `${val}W`}
            domain={[0, 'auto']}
            orientation="right"
          />
          
          <Tooltip 
            contentStyle={{ backgroundColor: '#0a0f18', border: '1px solid #1a2a44', borderRadius: '8px', fontSize: '11px' }}
            itemStyle={{ color: '#4fd1c5' }}
            labelStyle={{ display: 'none' }}
          />

          {/* Raw Sensor Noise (Subtle Red) */}
          <Area 
            type="monotone" 
            dataKey="real" 
            stroke="#fc8181" 
            strokeWidth={1}
            fill="transparent"
            isAnimationActive={false}
            opacity={0.3}
          />

          {/* Stabilized Normalized Waveform (Bright Teal) */}
          <Area 
            type="stepAfter" 
            dataKey="normalized" 
            stroke="#4fd1c5" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#waveGradient)" 
            filter="url(#glow)"
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
};

export default LiveWaveform;
