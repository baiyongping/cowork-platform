import { create } from 'zustand';

interface NotificationStore {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  showNotification: boolean;
  setShowNotification: (show: boolean) => void;
  playNotificationSound: () => void;
}

// 🔔 简单的提示音(使用AudioContext生成叮咚声)
const playBeep = (): void => {
  // 仅在浏览器环境中执行
  if (typeof window === 'undefined') return;
  
  try {
    // 检查AudioContext是否可用
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('浏览器不支持AudioContext');
      return;
    }
    
    const audioContext = new AudioContextClass();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // 频率
    oscillator.type = 'sine'; // 波形
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // 音量
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
  } catch (error) {
    console.warn('无法播放提示音:', error);
  }
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,
  setUnreadCount: (count: number) => set({ unreadCount: count }),
  showNotification: false,
  setShowNotification: (show: boolean) => set({ showNotification: show }),
  playNotificationSound: playBeep,
}));
