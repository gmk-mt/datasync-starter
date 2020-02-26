import React from 'react';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { IonBadge } from '@ionic/react';

export const NetworkBadge: React.FC = () => {

  const isOnline = useNetworkStatus();

  return (isOnline) 
    ?<IonBadge class="network-badge" color="secondary">Online</IonBadge>
    :<IonBadge class="network-badge" color="primary">Offline</IonBadge>;

};