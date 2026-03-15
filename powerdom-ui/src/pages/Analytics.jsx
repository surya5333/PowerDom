import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  getAnalyticsHistory, 
  getPeakPower, 
  getIdlePower, 
  getAnalyticsEvents, 
  getDailyEnergyCurve,
  getStatus
} from '../services/api';
import LiveWaveform from '../components/LiveWaveform';
import { 
  MdTimeline, 
  MdAnalytics, 
  MdTrendingUp, 
  MdPower, 
  MdHistory,
  MdFlashOn,
  MdSettingsInputComponent,
  MdFileDownload
} from 'react-icons/md';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const AnalyticsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 30px;
  padding-bottom: 50px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const ExportButton = styled.button`
  background: #1d6f42;
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  border: none;
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  &:hover { background: #145a32; }
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 500;
  color: #ffffff;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const StatLabel = styled.div`
  color: #a0aec0;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const StatValue = styled.div`
  color: #ffffff;
  font-size: 24px;
  font-weight: 700;
  span {
    font-size: 14px;
    font-weight: 400;
    margin-left: 4px;
    color: #a0aec0;
  }
`;

const StatSubtext = styled.div`
  color: #718096;
  font-size: 12px;
`;

const MainGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 30px;
  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
`;

const ChartSection = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 25px;
  height: 400px;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 500;
  color: #ffffff;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const EventList = styled.div`
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 25px;
  height: 400px;
  display: flex;
  flex-direction: column;
`;

const ScrollableList = styled.div`
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-right: 10px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 2px; }
`;

const EventItem = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 12px;
  border-radius: 8px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const EventInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const DeviceName = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: #ffffff;
`;

const EventType = styled.div`
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: ${props => props.type === 'DEVICE_ON' ? '#4fd1c5' : '#fc8181'};
`;

const EventTime = styled.div`
  font-size: 11px;
  color: #718096;
`;

const EventPower = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: #ffffff;
`;

const COLORS = ['#4fd1c5', '#3182ce', '#9f7aea', '#f6ad55', '#fc8181', '#63b3ed', '#a0aec0'];

const Analytics = () => {
  const [liveData, setLiveData] = useState([]);
  const [currentSensor, setCurrentSensor] = useState({ power: 0, current: 0 });
  const [peakPower, setPeakPower] = useState({ peakPower: 0, timestamp: Date.now() });
  const [idlePower, setIdlePower] = useState(0);
  const [dailyEnergy, setDailyEnergy] = useState([]);
  const [events, setEvents] = useState([]);
  const [history, setHistory] = useState([]);
  const [deviceDistribution, setDeviceDistribution] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const peak = await getPeakPower();
      const idle = await getIdlePower();
      const energy = await getDailyEnergyCurve();
      const evs = await getAnalyticsEvents();
      const hist = await getAnalyticsHistory();
      const status = await getStatus();

      setPeakPower(peak);
      setIdlePower(idle?.idlePower || 0);
      setDailyEnergy(energy);
      setEvents(evs);
      setHistory(hist);

      if (status && status.devices) {
        const dist = Object.values(status.devices)
          .filter(d => d.energy_wh > 0)
          .map(d => ({ name: d.name, value: d.energy_wh }));
        setDeviceDistribution(dist);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Update non-live data every 5s instead of 30s

    const eventSource = new EventSource("http://localhost:5000/analytics/live");
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setCurrentSensor({ power: data.power, current: data.current });
      setLiveData(prev => {
        const newData = [...prev, {
          time: new Date(data.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          power: data.power
        }];
        return newData.slice(-60); // Last 60 seconds
      });
    };

    return () => {
      clearInterval(interval);
      eventSource.close();
    };
  }, []);

  const handleExport = async () => {
    try {
      // 1. Get a token (Prototype Auto-Login)
      const loginRes = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin" })
      });
      const { token } = await loginRes.json();

      if (!token) throw new Error("Authentication failed");

      // 2. Fetch the report with the token
      const today = new Date();
      const end = today.toISOString().split('T')[0];
      const startD = new Date();
      startD.setDate(today.getDate() - 14); // 14 days to be safe
      const start = startD.toISOString().split('T')[0];
      const reportUrl = `http://localhost:5000/api/reports/energy-summary?start_date=${start}&end_date=${end}`;

      const response = await fetch(reportUrl, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (response.status === 204) {
        alert("No data found for the selected period.");
        return;
      }

      if (!response.ok) throw new Error("Report generation failed");

      // 3. Trigger download from blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `EnergySummary_${start}_${end}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Export error:", err);
      alert("Export failed: " + err.message);
    }
  };

  return (
    <AnalyticsContainer>
      <Header>
        <Title>
          <MdAnalytics size={32} color="#4fd1c5" />
          Production Analytics
        </Title>
        <ExportButton onClick={handleExport}>
          <MdFileDownload size={20} />
          Export Energy Report
        </ExportButton>
      </Header>

      <StatsGrid>
        <StatCard>
          <StatLabel><MdPower color="#4fd1c5" /> Current Power</StatLabel>
          <StatValue>{(currentSensor?.power || 0).toFixed(2)}<span>W</span></StatValue>
          <StatSubtext>Real-time sensor reading</StatSubtext>
        </StatCard>
        <StatCard>
          <StatLabel><MdTrendingUp color="#f6ad55" /> Peak Power Today</StatLabel>
          <StatValue>{(peakPower?.peakPower || 0).toFixed(2)}<span>W</span></StatValue>
          <StatSubtext>Detected at {peakPower?.timestamp ? new Date(peakPower.timestamp).toLocaleTimeString() : '---'}</StatSubtext>
        </StatCard>
        <StatCard>
          <StatLabel><MdSettingsInputComponent color="#9f7aea" /> Idle Consumption</StatLabel>
          <StatValue>{(idlePower || 0).toFixed(3)}<span>W</span></StatValue>
          <StatSubtext>Baseline system load</StatSubtext>
        </StatCard>
        <StatCard>
          <StatLabel><MdFlashOn color="#3182ce" /> Current Current</StatLabel>
          <StatValue>{(currentSensor?.current || 0).toFixed(3)}<span>A</span></StatValue>
          <StatSubtext>Line amperage</StatSubtext>
        </StatCard>
      </StatsGrid>

      <MainGrid>
        <ChartSection>
          <SectionTitle><MdTimeline color="#4fd1c5" /> Live Power Waveform (60s)</SectionTitle>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={liveData}>
              <defs>
                <linearGradient id="colorPower" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4fd1c5" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#4fd1c5" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="time" hide />
              <YAxis stroke="#718096" fontSize={12} unit="W" domain={[0, 'auto']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a2a44', border: 'none', borderRadius: '8px' }}
                itemStyle={{ color: '#4fd1c5' }}
              />
              <Area type="monotone" dataKey="power" stroke="#4fd1c5" fillOpacity={1} fill="url(#colorPower)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartSection>

        <ChartSection>
          <SectionTitle><MdTrendingUp color="#3182ce" /> Daily Energy Accumulation</SectionTitle>
          <ResponsiveContainer width="100%" height="90%">
            <AreaChart data={dailyEnergy}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="time" stroke="#718096" fontSize={10} interval={10} />
              <YAxis stroke="#718096" fontSize={12} unit="Wh" />
              <Tooltip contentStyle={{ backgroundColor: '#1a2a44', border: 'none', borderRadius: '8px' }} />
              <Area type="monotone" dataKey="energy" stroke="#3182ce" fill="#3182ce" fillOpacity={0.1} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartSection>

        <ChartSection>
          <SectionTitle><MdHistory color="#9f7aea" /> Device Energy Distribution</SectionTitle>
          <ResponsiveContainer width="100%" height="90%">
            <PieChart>
              <Pie
                data={deviceDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {deviceDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1a2a44', border: 'none', borderRadius: '8px' }}
                formatter={(val) => `${Number(val || 0).toFixed(2)} Wh`}
              />
              <Legend verticalAlign="bottom" height={36}/>
            </PieChart>
          </ResponsiveContainer>
        </ChartSection>

        <EventList>
          <SectionTitle><MdFlashOn color="#fc8181" /> Energy Events Timeline</SectionTitle>
          <ScrollableList>
            {events.length === 0 ? (
              <div style={{ color: '#718096', textAlign: 'center', marginTop: '50px' }}>No events detected yet</div>
            ) : (
              events.map(event => (
                <EventItem key={event.id}>
                  <EventInfo>
                    <DeviceName>{event.device_name || 'Unknown Load'}</DeviceName>
                    <EventType type={event.event_type}>
                      {event.event_type.replace('_', ' ')}
                    </EventType>
                    <EventTime>{new Date(event.timestamp).toLocaleString()}</EventTime>
                  </EventInfo>
                  <EventPower>
                    {event.delta_power > 0 ? '+' : ''}{(event.delta_power || 0).toFixed(3)} W
                  </EventPower>
                </EventItem>
              ))
            )}
          </ScrollableList>
        </EventList>
      </MainGrid>

      <ChartSection style={{ height: '350px' }}>
        <SectionTitle><MdHistory color="#a0aec0" /> 30-Day Energy Comparison</SectionTitle>
        <ResponsiveContainer width="100%" height="90%">
          <AreaChart data={history}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="date" stroke="#718096" fontSize={10} />
            <YAxis stroke="#718096" fontSize={12} unit="kWh" />
            <Tooltip contentStyle={{ backgroundColor: '#1a2a44', border: 'none', borderRadius: '8px' }} />
            <Area type="monotone" dataKey="total_kwh" stroke="#4fd1c5" fill="#4fd1c5" fillOpacity={0.1} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartSection>
    </AnalyticsContainer>
  );
};

export default Analytics;
