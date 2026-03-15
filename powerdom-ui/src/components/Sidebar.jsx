import React from 'react';
import styled from 'styled-components';
import { NavLink } from 'react-router-dom';
import { MdDashboard, MdAnalytics } from 'react-icons/md';

const SidebarContainer = styled.div`
  width: 240px;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.2);
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  padding: 30px 20px;
  position: fixed;
  left: 0;
  top: 0;
`;

const Logo = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 50px;
  span {
    color: ${({ theme }) => theme.colors.accentTeal};
  }
`;

const MenuList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const MenuItem = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  color: #a0aec0;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.3s ease;
  border-left: 4px solid transparent;

  svg {
    font-size: 20px;
    color: inherit;
  }

  span {
    font-size: 14px;
    font-weight: 400;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    color: #ffffff;
  }

  &.active {
    background: linear-gradient(90deg, rgba(79, 209, 197, 0.1) 0%, rgba(79, 209, 197, 0.02) 100%);
    border-left: 4px solid #4fd1c5;
    color: #ffffff;
    span {
      font-weight: 600;
    }
    svg {
      color: #4fd1c5;
    }
  }
`;

const Sidebar = () => {
  return (
    <SidebarContainer>
      <Logo>
        Power<span>Dom</span>
      </Logo>
      <MenuList>
        <MenuItem to="/" end>
          <MdDashboard />
          <span>Dashboard</span>
        </MenuItem>
        <MenuItem to="/analytics">
          <MdAnalytics />
          <span>Analytics</span>
        </MenuItem>
      </MenuList>
    </SidebarContainer>
  );
};

export default Sidebar;
