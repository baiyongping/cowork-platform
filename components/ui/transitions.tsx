import React from 'react';
import { cn } from './utils';

interface FadeInProps {
  children: React.ReactNode;
  duration?: 'fast' | 'normal' | 'slow';
  delay?: number;
  className?: string;
}

export function FadeIn({ children, duration = 'normal', delay = 0, className }: FadeInProps) {
  const durationClass = {
    fast: 'duration-300',
    normal: 'duration-500',
    slow: 'duration-700'
  }[duration];

  return (
    <div 
      className={cn(
        `animate-fade-in ${durationClass}`,
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

interface SlideUpProps {
  children: React.ReactNode;
  duration?: 'fast' | 'normal' | 'slow';
  delay?: number;
  className?: string;
}

export function SlideUp({ children, duration = 'normal', delay = 0, className }: SlideUpProps) {
  const durationClass = {
    fast: 'duration-300',
    normal: 'duration-500',
    slow: 'duration-700'
  }[duration];

  return (
    <div 
      className={cn(
        `animate-slide-up ${durationClass}`,
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

interface ScaleInProps {
  children: React.ReactNode;
  duration?: 'fast' | 'normal' | 'slow';
  delay?: number;
  className?: string;
}

export function ScaleIn({ children, duration = 'normal', delay = 0, className }: ScaleInProps) {
  const durationClass = {
    fast: 'duration-300',
    normal: 'duration-500',
    slow: 'duration-700'
  }[duration];

  return (
    <div 
      className={cn(
        `animate-scale-in ${durationClass}`,
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// 自定义动画效果
export const customAnimations = `
  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes scaleIn {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  @keyframes shimmer {
    0% {
      background-position: -200px 0;
    }
    100% {
      background-position: calc(200px + 100%) 0;
    }
  }

  @keyframes float {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-10px);
    }
  }

  @keyframes pulse-ring {
    0% {
      transform: scale(1);
      opacity: 1;
    }
    100% {
      transform: scale(1.5);
      opacity: 0;
    }
  }

  .animate-fade-in {
    animation: fadeIn var(--duration, 0.5s) ease-out;
  }

  .animate-slide-up {
    animation: slideUp var(--duration, 0.5s) ease-out;
  }

  .animate-scale-in {
    animation: scaleIn var(--duration, 0.5s) ease-out;
  }

  .animate-shimmer {
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    background-size: 200px 100%;
    animation: shimmer 1.5s infinite;
  }

  .animate-float {
    animation: float 3s ease-in-out infinite;
  }

  .animate-pulse-ring {
    animation: pulse-ring 2s ease-out infinite;
  }
`;

// 微交互组件
interface HoverCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  scale?: number;
  shadow?: boolean;
  className?: string;
}

export function HoverCard({ children, scale = 1.02, shadow = true, className, ...props }: HoverCardProps) {
  return (
    <div
      className={cn(
        `transition-all duration-300 cursor-pointer hover:scale-[${scale}]`,
        shadow && 'hover:shadow-card-hover',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

interface RippleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
}

export function RippleButton({ children, className, ...props }: RippleButtonProps) {
  const [ripples, setRipples] = React.useState<Array<{ id: number; x: number; y: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = { id: Date.now(), x, y };
    setRipples(prev => [...prev, newRipple]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);
  };

  return (
    <button
      className={cn('relative overflow-hidden', className)}
      onClick={handleClick}
      {...props}
    >
      {children}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute bg-white/30 rounded-full animate-ripple"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
          }}
        />
      ))}
    </button>
  );
}

// 波纹动画
export const rippleAnimation = `
  @keyframes ripple {
    0% {
      transform: scale(0);
      opacity: 0.6;
    }
    100% {
      transform: scale(4);
      opacity: 0;
    }
  }

  .animate-ripple {
    animation: ripple 0.6s ease-out;
    pointer-events: none;
  }
`;

// 滚动动画 Hook
export function useScrollAnimation(threshold = 0.1) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [threshold]);

  return { ref, isVisible };
}

// 滚动动画组件
interface ScrollAnimateProps {
  children: React.ReactNode;
  animation?: 'fadeIn' | 'slideUp' | 'scaleIn';
  threshold?: number;
  className?: string;
}

export function ScrollAnimate({ 
  children, 
  animation = 'slideUp', 
  threshold = 0.1,
  className 
}: ScrollAnimateProps) {
  const { ref, isVisible } = useScrollAnimation(threshold);

  const animationClass = {
    fadeIn: 'animate-fade-in',
    slideUp: 'animate-slide-up',
    scaleIn: 'animate-scale-in'
  }[animation];

  return (
    <div
      ref={ref}
      className={cn(
        isVisible ? animationClass : 'opacity-0',
        'duration-500',
        className
      )}
    >
      {children}
    </div>
  );
}