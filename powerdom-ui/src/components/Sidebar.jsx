import React from 'react';
import styled from 'styled-components';
import { MdDashboard } from 'react-icons/md';

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

const MenuItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  color: #ffffff;
  cursor: pointer;
  background: ${({ active }) => (active ? 'linear-gradient(90deg, #3182ce 0%, rgba(49, 130, 206, 0.2) 100%)' : 'transparent')};
  border-left: ${({ active }) => (active ? '4px solid #4fd1c5' : '4px solid transparent')};
  transition: all 0.3s ease;

  svg {
    font-size: 20px;
    color: ${({ active }) => (active ? '#ffffff' : '#a0aec0')};
  }

  span {
    font-size: 14px;
    font-weight: ${({ active }) => (active ? '600' : '400')};
  }

  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
`;

const Sidebar = () => {
  return (
    <SidebarContainer>
      <Logo>
        Power<span>Dom</span>
      </Logo>
      <MenuList>
        <MenuItem active>
          <MdDashboard />
          <span>Dashboard</span>
        </MenuItem>
      </MenuList>
    </SidebarContainer>
  );
};

export default Sidebar;
