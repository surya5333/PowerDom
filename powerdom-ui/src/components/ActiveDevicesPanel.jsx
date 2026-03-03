import React from 'react';
import styled from 'styled-components';
import { Card, CardTitle } from './Card';
import { FaPowerOff } from 'react-icons/fa';

const DeviceList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background-color: ${({ theme }) => theme.colors.border};
    border-radius: 3px;
  }
`;

const DeviceItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px;
  background-color: rgba(255, 255, 255, 0.03);
  border-radius: 5px;
`;

const DeviceInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const DeviceName = styled.span`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

const DeviceEnergy = styled.span`
  font-size: 12px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const ToggleButton = styled.button`
  background-color: ${({ isOn, theme }) => (isOn ? theme.colors.accentTeal : theme.colors.cardBg)};
  color: ${({ isOn, theme }) => (isOn ? theme.colors.background : theme.colors.textSecondary)};
  border: 1px solid ${({ isOn, theme }) => (isOn ? theme.colors.accentTeal : theme.colors.border)};
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 5px;
  transition: all 0.2s;

  &:hover {
    opacity: 0.9;
  }
`;

const PriorityBar = styled.div`
  width: 4px;
  height: 30px;
  background-color: ${({ priority, theme }) => {
    switch(priority) {
      case 1: return theme.colors.danger; // High priority
      case 2: return theme.colors.accentPurple;
      case 3: return theme.colors.accentCyan;
      default: return theme.colors.textSecondary;
    }
  }};
  margin-right: 10px;
  border-radius: 2px;
`;

const ActiveDevicesPanel = ({ devices, onToggle }) => {
  return (
    <Card>
      <CardTitle>Active Appliances</CardTitle>
      <DeviceList>
        {devices.map((device) => (
          <DeviceItem key={device.id}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <PriorityBar priority={device.priority} />
              <DeviceInfo>
                <DeviceName>{device.name}</DeviceName>
                <DeviceEnergy>{device.energy_wh.toFixed(2)} Wh</DeviceEnergy>
              </DeviceInfo>
            </div>
            <ToggleButton 
              isOn={device.status === 'ON'}
              onClick={() => onToggle(device.id, device.status)}
            >
              <FaPowerOff />
              {device.status === 'ON' ? 'ON' : 'OFF'}
            </ToggleButton>
          </DeviceItem>
        ))}
      </DeviceList>
    </Card>
  );
};

export default ActiveDevicesPanel;
