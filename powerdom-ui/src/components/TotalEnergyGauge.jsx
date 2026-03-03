import React from 'react';
import styled from 'styled-components';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const GaugeContainer = styled.div`
  width: 200px;
  height: 200px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const GaugeValue = styled.div`
  position: absolute;
  text-align: center;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const Label = styled.div`
  font-size: 14px;
  color: ${({ theme }) => theme.colors.textSecondary};
`;

const Value = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: ${({ theme }) => theme.colors.textPrimary};
  span {
    font-size: 16px;
    margin-left: 4px;
  }
`;

const TotalEnergyGauge = ({ totalEnergy }) => {
  const data = [
    { name: 'Consumed', value: totalEnergy },
    { name: 'Remaining', value: Math.max(0, 300 - totalEnergy) }, // Just for visual placeholder
  ];

  const COLORS = ['#4fd1c5', 'rgba(255, 255, 255, 0.1)'];

  return (
    <GaugeContainer>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={70}
            outerRadius={90}
            startAngle={180}
            endAngle={-180}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <GaugeValue>
        <Label>Total Energy</Label>
        <Value>
          {totalEnergy.toFixed(4)}
          <span>Wh</span>
        </Value>
      </GaugeValue>
    </GaugeContainer>
  );
};

export default TotalEnergyGauge;
