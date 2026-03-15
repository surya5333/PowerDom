import React from 'react';
import styled from 'styled-components';
import Sidebar from './Sidebar';
import { MdFileDownload } from 'react-icons/md';

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
`;

const MainContent = styled.main`
  flex-grow: 1;
  margin-left: 240px; /* Sidebar width */
  padding: 40px;
  background: transparent;
`;

const ExcelButton = styled.button`
  position: fixed;
  bottom: 30px;
  left: 30px;
  background: #1d6f42;
  color: white;
  padding: 12px 20px;
  border-radius: 30px;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  font-weight: 600;
  font-size: 14px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s, background 0.2s;
  z-index: 1000;
  &:hover {
    background: #145a32;
    transform: translateY(-2px);
  }
`;

const Layout = ({ children }) => {
  const handleGlobalExport = async () => {
    try {
      const loginRes = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin" })
      });
      const { token } = await loginRes.json();
      if (!token) throw new Error("Authentication failed");

      const response = await fetch("http://localhost:5000/export/excel", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PowerDom_Energy_Report.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert("Export failed: " + err.message);
    }
  };

  return (
    <LayoutContainer>
      <Sidebar />
      <ExcelButton onClick={handleGlobalExport}>
        <MdFileDownload size={20} />
        Export Excel
      </ExcelButton>
      <MainContent>
        {children}
      </MainContent>
    </LayoutContainer>
  );
};

export default Layout;
