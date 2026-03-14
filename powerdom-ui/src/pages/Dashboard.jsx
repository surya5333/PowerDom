import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { getStatus, turnOn, turnOff, resetDevices, setMonthlyLimit, getHistory } from '../services/api';
import DeviceCard from '../components/DeviceCard';
import TotalEnergyGauge from '../components/TotalEnergyGauge';
import Notification from '../components/Notification';
import { MdChevronRight, MdWarning, MdSettings, MdHistory, MdTimeline } from 'react-icons/md';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

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

const HistorySection = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 30px;
  height: 350px;
`;

const LiveGraphSection = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 30px;
  height: 400px;
`;

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [liveChartData, setLiveChartData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // SSE for real-time power updates
  useEffect(() => {
    console.log("Connecting to SSE /live...");
    const eventSource = new EventSource("http://localhost:5000/live");

    eventSource.onopen = () => {
      console.log("SSE Connection opened");
    };

    eventSource.onmessage = (event) => {
      try {
        const liveData = JSON.parse(event.data);
        console.log("SSE Message received:", liveData);
        
        // Update main data state for numerical cards
      setData(prev => prev ? { 
        ...prev, 
        realPower: liveData.realPower, 
        realCurrent: liveData.realCurrent,
        estimatedPower: liveData.estimatedPower,
        normalizedPower: liveData.normalizedPower,
        distributedPower: liveData.distributedPower, // Add this
        realEnergyWh: liveData.realEnergyWh,
        estimatedEnergyWh: liveData.estimatedEnergyWh,
        current_power_draw_watts: liveData.estimatedPower
      } : null);

        setLiveChartData(prev => {
          const newData = [
            ...prev,
            {
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              real: liveData.realPower || 0,
              estimated: liveData.estimatedPower || 0,
              normalized: liveData.normalizedPower || 0
            }
          ];
          // Keep last 30 points
          return newData.slice(-30);
        });
      } catch (err) {
        console.error("Error parsing SSE data:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE Error:", err);
      eventSource.close();
    };

    return () => {
      console.log("Closing SSE connection");
      eventSource.close();
    };
  }, []);

  const fetchData = async () => {
    const result = await getStatus();
    if (result) {
      setData(result);
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

  const fetchHistory = async () => {
    const historyData = await getHistory();
    console.log("Fetched History Data:", historyData);
    setHistory([...historyData].reverse()); // Copy and reverse for chronological view
  };

  useEffect(() => {
    fetchData();
    fetchHistory();
    const statusInterval = setInterval(fetchData, 2000);
    const historyInterval = setInterval(fetchHistory, 10000); // Update graph every 10s
    return () => {
      clearInterval(statusInterval);
      clearInterval(historyInterval);
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
          <BudgetLabel>Measured Power</BudgetLabel>
          <BudgetValue color="#ff4d4f">
            {data?.realPower?.toFixed(2) || '0.00'}<span>W</span>
          </BudgetValue>
        </BudgetCard>
        <BudgetCard>
          <BudgetLabel>Normalized (Appliance)</BudgetLabel>
          <BudgetValue color="#ff7a45">
            {data?.normalizedPower?.toFixed(1) || '0.0'}<span>W</span>
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

      <LiveGraphSection>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <MdTimeline size={20} color="#a0aec0" />
          <h2 style={{ fontSize: '18px', fontWeight: 500 }}>Real-Time Power Comparison (Real vs. Estimated)</h2>
        </div>
        <ResponsiveContainer width="100%" height="80%">
          <LineChart data={liveChartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="time" stroke="#718096" fontSize={10} tick={{ fill: '#718096' }} />
            <YAxis stroke="#718096" fontSize={12} unit="W" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1a2a44', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
              itemStyle={{ fontSize: '12px' }}
            />
            <Legend verticalAlign="top" height={36} />
            <Line 
              type="monotone" 
              dataKey="real" 
              stroke="#ff4d4f" 
              strokeWidth={2}
              name="Measured Power (Raw)" 
              dot={false}
              isAnimationActive={false}
            />
            <Line 
              type="monotone" 
              dataKey="normalized" 
              stroke="#ff7a45" 
              strokeWidth={2}
              name="Normalized Power (Scaled)" 
              dot={false}
              isAnimationActive={false}
            />
            <Line 
              type="monotone" 
              dataKey="estimated" 
              stroke="#1890ff" 
              strokeWidth={2}
              name="Estimated Power (Model)" 
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </LiveGraphSection>

      <HistorySection>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
          <MdHistory size={20} color="#a0aec0" />
          <h2 style={{ fontSize: '18px', fontWeight: 500 }}>Energy Consumption Trend</h2>
        </div>
        <ResponsiveContainer width="100%" height="80%">
          <AreaChart data={history}>
            <defs>
              <linearGradient id="colorKwh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4fd1c5" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#4fd1c5" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="date" stroke="#718096" fontSize={12} tickFormatter={(str) => str.split('-').slice(1).join('/')} />
            <YAxis stroke="#718096" fontSize={12} unit="kWh" />
            <Tooltip contentStyle={{ backgroundColor: '#1a2a44', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="total_kwh" stroke="#4fd1c5" fillOpacity={1} fill="url(#colorKwh)" name="Energy (kWh)" />
          </AreaChart>
        </ResponsiveContainer>
      </HistorySection>
    </DashboardContainer>
  );
};

export default Dashboard;
