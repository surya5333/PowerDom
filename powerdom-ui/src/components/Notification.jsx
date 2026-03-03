import React, { useEffect, useRef } from 'react';
import styled from 'styled-components';
import { MdInfoOutline, MdClose } from 'react-icons/md';

const Toast = styled.div`
  position: fixed;
  bottom: 20px;
  right: 20px;
  background-color: ${({ theme }) => theme.colors.accentTeal};
  color: ${({ theme }) => theme.colors.background};
  padding: 8px 16px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  z-index: 1000;
  animation: slideIn 0.3s ease-out;

  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;

const Message = styled.div`
  font-weight: 500;
  font-size: 12px;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  display: flex;
  padding: 2px;
  opacity: 0.7;
  &:hover { opacity: 1; }
`;

const Notification = ({ message, onClose }) => {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const timer = setTimeout(() => {
      onCloseRef.current();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Toast>
      <MdInfoOutline size={16} />
      <Message>{message}</Message>
      <CloseButton onClick={() => onCloseRef.current()}>
        <MdClose size={14} />
      </CloseButton>
    </Toast>
  );
};

export default Notification;
