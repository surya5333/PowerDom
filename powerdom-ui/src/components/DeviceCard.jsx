import React from 'react';
import styled from 'styled-components';

const Card = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: transform 0.2s ease, background 0.2s ease;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  pointer-events: ${({ disabled }) => (disabled ? 'none' : 'auto')};

  &:hover {
    background: ${({ disabled }) => (disabled ? 'rgba(255, 255, 255, 0.03)' : 'rgba(255, 255, 255, 0.05)')};
    transform: ${({ disabled }) => (disabled ? 'none' : 'translateY(-2px)')};
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Name = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #ffffff;
`;

const Switch = styled.div`
  width: 32px;
  height: 16px;
  background: ${({ isOn, theme }) => (isOn ? theme.colors.accentTeal : '#4a5568')};
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s;

  &::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    background: #ffffff;
    border-radius: 50%;
    top: 2px;
    left: ${({ isOn }) => (isOn ? '18px' : '2px')};
    transition: left 0.2s;
  }
`;

const StatusBadge = styled.div`
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: bold;
  width: fit-content;
  background: ${({ isOn, theme }) => (isOn ? 'rgba(79, 209, 197, 0.15)' : 'rgba(45, 55, 72, 0.5)')};
  color: ${({ isOn, theme }) => (isOn ? theme.colors.accentTeal : '#a0aec0')};
  border: 1px solid ${({ isOn, theme }) => (isOn ? 'rgba(79, 209, 197, 0.2)' : 'transparent')};
`;

const EnergyInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const EnergyValue = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  span {
    font-size: 14px;
    font-weight: 400;
    margin-left: 4px;
    color: #a0aec0;
  }
`;

const Priority = styled.div`
  font-size: 12px;
  color: #718096;
`;

const ActionButton = styled.button`
  width: 100%;
  padding: 10px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  margin-top: 4px;
  background: ${({ isOn, theme }) => (isOn ? 'rgba(79, 209, 197, 0.15)' : 'rgba(49, 130, 206, 0.15)')};
  color: ${({ isOn, theme }) => (isOn ? theme.colors.accentTeal : theme.colors.accentBlue)};
  border: 1px solid ${({ isOn, theme }) => (isOn ? 'rgba(79, 209, 197, 0.3)' : 'rgba(49, 130, 206, 0.3)')};

  &:hover {
    background: ${({ isOn, theme, disabled }) => {
      if (disabled) return 'transparent';
      return isOn ? 'rgba(79, 209, 197, 0.25)' : 'rgba(49, 130, 206, 0.25)';
    }};
  }
`;

const TimeActive = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  font-family: 'Courier New', Courier, monospace;
  letter-spacing: 0.5px;
  text-align: right;
`;

const formatTime = (ms) => {
  if (!ms || ms < 0) return '00:00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const DeviceCard = ({ device, onToggle, disabled }) => {
  const isOn = device.status === 'ON';

  return (
    <Card disabled={disabled}>
      <CardHeader>
        <Name>{device.name}</Name>
        <Switch isOn={isOn} onClick={() => !disabled && onToggle(device.id, device.status)} />
      </CardHeader>
      
      <StatusBadge isOn={isOn}>{device.status}</StatusBadge>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <EnergyInfo>
          <EnergyValue>
            {device.energy_wh.toFixed(4)}
            <span>Wh</span>
          </EnergyValue>
          <Priority>Priority: {device.priority}</Priority>
        </EnergyInfo>
        <TimeActive>
          {formatTime(device.time_ms)}
        </TimeActive>
      </div>

      <ActionButton 
        isOn={isOn} 
        disabled={disabled}
        onClick={() => !disabled && onToggle(device.id, device.status)}
      >
        Turn {isOn ? 'OFF' : 'ON'}
      </ActionButton>
    </Card>
  );
};

export default DeviceCard;
