import React from 'react';
import styled from 'styled-components';
import { 
  MdSettingsInputComponent, 
  MdFlashOn, 
  MdFlashOff, 
  MdKitchen, 
  MdAir, 
  MdLightbulb, 
  MdTv, 
  MdLaptop, 
  MdRouter, 
  MdWash, 
  MdIron,
  MdWaterDrop,
  MdDeviceHub
} from 'react-icons/md';

const Panel = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 400px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  color: #a0aec0;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const EventList = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 5px;

  &::-webkit-scrollbar {
    width: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
  }
`;

const EventItem = styled.div`
  background: ${props => props.$type === 'ON' ? 'rgba(79, 209, 197, 0.03)' : 'rgba(252, 129, 129, 0.03)'};
  border: 1px solid ${props => props.$type === 'ON' ? 'rgba(79, 209, 197, 0.1)' : 'rgba(252, 129, 129, 0.1)'};
  padding: 12px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const DeviceIcon = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.$type === 'ON' ? 'rgba(79, 209, 197, 0.1)' : 'rgba(252, 129, 129, 0.1)'};
  color: ${props => props.$type === 'ON' ? '#4fd1c5' : '#fc8181'};
`;

const EventContent = styled.div`
  flex: 1;
  margin-left: 12px;
`;

const DeviceName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const SignatureBadge = styled.span`
  font-size: 9px;
  padding: 1px 4px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.05);
  color: #718096;
  text-transform: uppercase;
`;

const EventMeta = styled.div`
  font-size: 11px;
  color: #718096;
  margin-top: 2px;
`;

const PowerValue = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${props => props.$type === 'ON' ? '#4fd1c5' : '#fc8181'};
  text-align: right;
  span {
    font-size: 10px;
    font-weight: 400;
    margin-left: 2px;
    opacity: 0.6;
  }
`;

const getApplianceIcon = (name) => {
  const lower = name.toLowerCase();
  if (lower.includes('fan')) return <MdAir />;
  if (lower.includes('light')) return <MdLightbulb />;
  if (lower.includes('ac')) return <MdAir />;
  if (lower.includes('tv')) return <MdTv />;
  if (lower.includes('laptop')) return <MdLaptop />;
  if (lower.includes('router')) return <MdRouter />;
  if (lower.includes('wash')) return <MdWash />;
  if (lower.includes('iron')) return <MdIron />;
  if (lower.includes('pump')) return <MdWaterDrop />;
  if (lower.includes('fridge')) return <MdKitchen />;
  return <MdDeviceHub />;
};

const EventDetectionPanel = ({ events }) => {
  return (
    <Panel>
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MdSettingsInputComponent size={16} />
          Signature Detection
        </div>
        <span style={{ color: '#4a5568', fontSize: '10px' }}>{events.length} Signals</span>
      </Header>
      <EventList>
        {events.length === 0 ? (
          <div style={{ color: '#4a5568', fontSize: '12px', textAlign: 'center', marginTop: '40px' }}>
            Awaiting load signature...
          </div>
        ) : (
          events.map((event) => (
            <EventItem key={event.id} $type={event.type}>
              <DeviceIcon $type={event.type}>
                {getApplianceIcon(event.deviceName)}
              </DeviceIcon>
              <EventContent>
                <DeviceName>
                  {event.deviceName}
                  <SignatureBadge>Verified</SignatureBadge>
                </DeviceName>
                <EventMeta>
                  {event.type === 'ON' ? 'Load Detected' : 'Load Terminated'} • {event.time}
                </EventMeta>
              </EventContent>
              <PowerValue $type={event.type}>
                {event.type === 'ON' ? '+' : '-'}{event.power}
                <span>W</span>
              </PowerValue>
            </EventItem>
          ))
        )}
      </EventList>
    </Panel>
  );
};

export default EventDetectionPanel;
