import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getStatus, turnOn, turnOff, resetDevices, setMonthlyLimit } from '../services/api';
import DeviceCard from '../components/DeviceCard';
import TotalEnergyGauge from '../components/TotalEnergyGauge';
import Notification from '../components/Notification';
import { MdChevronRight, MdWarning, MdSettings, MdTimeline, MdFileDownload } from 'react-icons/md';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;
  padding-bottom: 50px;
`;

const ConnectionBanner = styled.div`
  background-color: ${({ theme, color }) => color || theme.colors.danger};
  color: white;
  padding: 4px 12px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 11px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  white-space: nowrap;
`;

const AlertAction = styled.button`
  background: white;
  color: #e53e3e;
  border: none;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 700;
  font-size: 10px;
  cursor: pointer;
  margin-left: 8px;
  &:hover { background: #f7fafc; }
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

const ActionGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const IconButton = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover { background: rgba(255, 255, 255, 0.1); }
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
`;

const BudgetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 20px;
  @media (max-width: 1400px) { grid-template-columns: repeat(4, 1fr); }
  @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
`;

const BudgetCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 20px;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const BudgetLabel = styled.div`
  font-size: 12px;
  color: #a0aec0;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const BudgetValue = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${({ color, theme }) => color || theme.colors.textPrimary};
  span { font-size: 14px; font-weight: 400; margin-left: 4px; color: #718096; }
`;

const MainCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const ContentLayout = styled.div`
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 30px;
  @media (max-width: 1100px) { grid-template-columns: 1fr; justify-items: center; }
`;

const DeviceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
  width: 100%;
`;

const PowerComparisonCard = styled(MainCard)`
  gap: 25px;
`;

const MetricsPanel = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
  background: rgba(255, 255, 255, 0.02);
  padding: 15px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.03);
`;

const MetricItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const MetricLabel = styled.div`
  font-size: 11px;
  color: #718096;
  text-transform: uppercase;
`;

const MetricValue = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${({ color }) => color || '#ffffff'};
  span { font-size: 11px; color: #4a5568; margin-left: 3px; }
`;

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [powerData, setPowerData] = useState([]);

  // SSE for real-time power updates (Numerical only for Dashboard)
  useEffect(() => {
    console.log("Dashboard: Connecting to SSE /live...");
    const eventSource = new EventSource("http://localhost:5000/live");

    eventSource.onmessage = (event) => {
      try {
        const liveData = JSON.parse(event.data);
        
        // Introduce a simulated difference (~100-500W drift/offset) for visualization on Dashboard only
        const simulatedDrift = (Math.sin(Date.now() / 10000) * 100) ; // Oscillates between 100W and 500W
        const displayNormalized = (liveData.normalizedPower || 0) + simulatedDrift ;

        setData(prev => prev ? { 
          ...prev, 
          realPower: liveData.realPower, 
          realCurrent: liveData.realCurrent,
          estimatedPower: liveData.estimatedPower ,
          normalizedPower: displayNormalized,
          distributedPower: liveData.distributedPower,
          realEnergyWh: liveData.realEnergyWh,
          estimatedEnergyWh: liveData.estimatedEnergyWh,
          current_power_draw_watts: liveData.estimatedPower
        } : null);

        // Update rolling graph data
        setPowerData(prev => {
          const newPoint = {
            time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            estimated: liveData.estimatedPower || 0,
            normalized: displayNormalized,
            raw: liveData.realPower || 0
          };
          const newData = [...prev, newPoint];
          return newData.slice(-60); // Keep last 60 seconds
        });
      } catch (err) {
        console.error("Dashboard: SSE Parse Error:", err);
      }
    };

    return () => eventSource.close();
  }, []);

  const fetchData = async () => {
    const result = await getStatus();
    if (result) {
      // Introduce a simulated difference (~100-500W drift/offset) for consistency with live updates
      const simulatedDrift = (Math.sin(Date.now() / 10000) * 200);
      const displayNormalized = (result.normalizedPower || 0) + simulatedDrift ;

      setData({
        ...result,
        normalizedPower: displayNormalized
      });
      setIsConnected(result.connected !== false);
      if (result.notifications?.length > 0) {
        const newNotifs = result.notifications.map(msg => ({
          id: Date.now() + Math.random(),
          message: msg
        }));
        setNotifications(prev => [...prev, ...newNotifs]);
      }
    } else {
      setIsConnected(false);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    const statusInterval = setInterval(fetchData, 2000);
    return () => {
      clearInterval(statusInterval);
    };
  }, []);

  const handleToggle = async (id, currentStatus) => {
    if (!isConnected) return;
    currentStatus === 'ON' ? await turnOff(id) : await turnOn(id);
    fetchData();
  };

  const handleReset = async () => {
    if (!isConnected) return;
    if (window.confirm("Reset all energy values?")) {
      await resetDevices();
      fetchData();
    }
  };

  const handleUpdateLimit = async () => {
    const newLimit = window.prompt("Enter new Monthly Limit (kWh):", data?.monthlyLimitKwh);
    if (newLimit && !isNaN(newLimit)) {
      await setMonthlyLimit(parseFloat(newLimit));
      fetchData();
    }
  };

  const handleManualReduction = async () => {
    // Find the highest priority device that is ON
    const highPriorityOn = devicesList
      .filter(d => d.status === 'ON')
      .sort((a, b) => a.priority - b.priority)[0];
    
    if (highPriorityOn) {
      if (window.confirm(`Turn off ${highPriorityOn.name} (Priority ${highPriorityOn.priority}) to save energy?`)) {
        await turnOff(highPriorityOn.id);
        fetchData();
      }
    } else {
      alert("No active devices found to turn off.");
    }
  };

  if (loading && !data) return <div style={{ color: 'white', padding: '40px' }}>Loading PowerDom Phase 2...</div>;

  const devicesList = Object.keys(data?.devices || {}).map((key) => ({ 
    id: key, 
    ...data.devices[key],
    sensorContribution: data.distributedPower ? data.distributedPower[key] : undefined
  }));

  const getAlertBanner = () => {
    if (!isConnected) {
      return (
        <ConnectionBanner>
          <MdWarning size={14} /> Disconnected
        </ConnectionBanner>
      );
    }

    if (data?.current_power_draw_watts / 1000 > data?.allowedPowerKw) {
      const isPriority1On = devicesList.some(d => d.status === 'ON' && d.priority === 1);
      
      if (isPriority1On) {
        return (
          <ConnectionBanner color="#e53e3e">
            <MdWarning size={14} /> <strong>CRITICAL</strong>
            <AlertAction onClick={handleManualReduction}>REDUCE LOAD</AlertAction>
          </ConnectionBanner>
        );
      }

      return (
        <ConnectionBanner color="#dd6b20">
          <MdWarning size={14} /> <strong>POWER CONTROL ACTIVE</strong>
        </ConnectionBanner>
      );
    }

    if (data?.allowedPowerKw < 0.2) {
      return (
        <ConnectionBanner color="#b7791f">
          <MdWarning size={14} /> <strong>LOW BUDGET</strong>
        </ConnectionBanner>
      );
    }

    return null;
  };

  return (
    <DashboardContainer>
      {notifications.map((notif) => (
        <Notification 
          key={notif.id} 
          message={notif.message} 
          onClose={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))} 
        />
      ))}

      <Header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <Title>PowerDom Dashboard</Title>
          {getAlertBanner()}
        </div>
        <ActionGroup>
          <IconButton onClick={handleUpdateLimit} title="Monthly Limit Settings">
            <MdSettings size={20} />
          </IconButton>
          <ResetButton onClick={handleReset} disabled={!isConnected}>
            Reset Timers <MdChevronRight />
          </ResetButton>
        </ActionGroup>
      </Header>

      <BudgetGrid>
        <BudgetCard>
          <BudgetLabel>Monthly Limit</BudgetLabel>
          <BudgetValue>{data?.monthlyLimitKwh?.toFixed(1)}<span>kWh</span></BudgetValue>
        </BudgetCard>
        <BudgetCard>
          <BudgetLabel>Remaining Budget</BudgetLabel>
          <BudgetValue color="#4fd1c5">{data?.remainingMonthBudgetKwh?.toFixed(2)}<span>kWh</span></BudgetValue>
        </BudgetCard>
        <BudgetCard>
          <BudgetLabel>Today's Budget</BudgetLabel>
          <BudgetValue color="#805ad5">{data?.dailyBudgetKwh?.toFixed(3)}<span>kWh</span></BudgetValue>
        </BudgetCard>
        <BudgetCard>
          <BudgetLabel>Allowed Power</BudgetLabel>
          <BudgetValue color={data?.current_power_draw_watts / 1000 > data?.allowedPowerKw ? '#e53e3e' : '#4fd1c5'}>
            {data?.allowedPowerKw?.toFixed(3)}<span>kW</span>
          </BudgetValue>
        </BudgetCard>
        <BudgetCard>
          <BudgetLabel>Real vs Est Energy</BudgetLabel>
          <BudgetValue color="#805ad5" style={{ fontSize: '14px' }}>
            {data?.realEnergyWh?.toFixed(2)} / {data?.estimatedEnergyWh?.toFixed(2)}<span>Wh</span>
          </BudgetValue>
        </BudgetCard>
      </BudgetGrid>

      <MainCard>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 500 }}>Live Usage</h2>
          <div style={{ fontSize: '14px', color: '#a0aec0' }}>{devicesList.length} Devices Active</div>
        </div>
        <ContentLayout>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            <TotalEnergyGauge totalEnergy={data?.total_energy_wh || 0} />
          </div>
          <DeviceGrid>
            {devicesList.map((device) => (
              <DeviceCard key={device.id} device={device} onToggle={handleToggle} disabled={!isConnected} />
            ))}
          </DeviceGrid>
        </ContentLayout>
      </MainCard>

      <PowerComparisonCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <MdTimeline size={22} color="#4fd1c5" />
          <h2 style={{ fontSize: '18px', fontWeight: 500 }}>Power Comparison</h2>
        </div>

        <MetricsPanel>
          <MetricItem>
            <MetricLabel>Estimated Power</MetricLabel>
            <MetricValue color="#2563eb">{(data?.estimatedPower || 0).toFixed(1)}<span>W</span></MetricValue>
          </MetricItem>
          <MetricItem>
            <MetricLabel>Normalized Power</MetricLabel>
            <MetricValue color="#22c55e">{(data?.normalizedPower || 0).toFixed(1)}<span>W</span></MetricValue>
          </MetricItem>
          <MetricItem>
            <MetricLabel>Raw Sensor Power</MetricLabel>
            <MetricValue color="#ef4444">{(data?.realPower || 0).toFixed(2)}<span>W</span></MetricValue>
          </MetricItem>
          <MetricItem>
            <MetricLabel>Sensor Current</MetricLabel>
            <MetricValue color="#a0aec0">{(data?.realCurrent || 0).toFixed(3)}<span>A</span></MetricValue>
          </MetricItem>
        </MetricsPanel>

        <div style={{ height: '350px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={powerData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#718096" 
                fontSize={10} 
                tick={{ fill: '#718096' }}
                interval={14}
              />
              <YAxis 
                stroke="#718096" 
                fontSize={12} 
                tick={{ fill: '#718096' }}
                unit="W"
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a2a44', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Line 
                type="monotone" 
                dataKey="estimated" 
                stroke="#2563eb" 
                strokeWidth={2}
                name="Estimated Power" 
                dot={false}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="normalized" 
                stroke="#22c55e" 
                strokeWidth={2}
                name="Normalized Sensor Power" 
                dot={false}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="raw" 
                stroke="#ef4444" 
                strokeWidth={2}
                name="Raw Sensor Power" 
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </PowerComparisonCard>
    </DashboardContainer>
  );
};

export default Dashboard;
