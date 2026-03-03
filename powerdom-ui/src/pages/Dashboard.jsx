import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getStatus, turnOn, turnOff, resetDevices } from '../services/api';
import DeviceCard from '../components/DeviceCard';
import TotalEnergyGauge from '../components/TotalEnergyGauge';
import { MdChevronRight, MdWarning } from 'react-icons/md';

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;
`;

const ConnectionBanner = styled.div`
  background-color: ${({ theme }) => theme.colors.danger};
  color: white;
  padding: 12px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: 600;
  margin-bottom: 10px;
  box-shadow: 0 4px 12px rgba(229, 62, 62, 0.4);
  animation: slideDown 0.3s ease-out;

  @keyframes slideDown {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 500;
  color: #ffffff;
`;

const ResetButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};

  &:hover {
    background: ${({ disabled }) => (disabled ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.1)')};
  }

  svg {
    font-size: 18px;
  }
`;

const MainCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: relative;
`;

const CardTitle = styled.h2`
  font-size: 18px;
  font-weight: 500;
  color: #ffffff;
  margin-bottom: 10px;
`;

const ContentLayout = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 30px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    justify-items: center;
  }
`;

const DeviceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  width: 100%;
`;

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  const fetchData = async () => {
    const result = await getStatus();
    if (result) {
      setData(result);
      setIsConnected(result.connected !== false);
    } else {
      setIsConnected(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleToggle = async (id, currentStatus) => {
    if (!isConnected) return;
    if (currentStatus === 'ON') {
      await turnOff(id);
    } else {
      await turnOn(id);
    }
    fetchData();
  };

  const handleReset = async () => {
    if (!isConnected) return;
    if (window.confirm("Are you sure you want to reset all energy values?")) {
      await resetDevices();
      fetchData();
    }
  };

  if (loading && !data) return <div style={{ color: 'white' }}>Loading...</div>;

  const devicesList = Object.keys(data?.devices || {}).map((key) => ({
    id: key,
    ...data.devices[key],
  }));

  return (
    <DashboardContainer>
      {!isConnected && (
        <ConnectionBanner>
          <MdWarning size={24} />
          Hardware Disconnected - Attempting to reconnect...
        </ConnectionBanner>
      )}

      <Header>
        <Title>PowerDom Dashboard</Title>
        <ResetButton onClick={handleReset} disabled={!isConnected}>
          Reset Timers <MdChevronRight />
        </ResetButton>
      </Header>

      <MainCard>
        <CardTitle>Total Energy</CardTitle>
        <ContentLayout>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <TotalEnergyGauge totalEnergy={data?.total_energy_wh || 0} />
          </div>
          <DeviceGrid>
            {devicesList.map((device) => (
              <DeviceCard 
                key={device.id} 
                device={device} 
                onToggle={handleToggle}
                disabled={!isConnected}
              />
            ))}
            {isConnected && devicesList.length === 0 && (
              <div style={{ color: '#a0aec0', gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>
                No devices found. Requesting status...
              </div>
            )}
          </DeviceGrid>
        </ContentLayout>
      </MainCard>
    </DashboardContainer>
  );
};

export default Dashboard;
