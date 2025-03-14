// Enhanced glassmorphism effect with dynamic lighting
export const initGlassmorphismEffect = (): (() => void) => {
  const lightElement = document.querySelector('.glassmorphism-light');
  
  if (!lightElement) return () => {};
  
  // Create floating particles for enhanced visual effect
  const createParticles = () => {
    const container = document.createElement('div');
    container.className = 'glassmorphism-particles';
    document.body.appendChild(container);
    
    // Create 15 particles with random properties
    for (let i = 0; i < 15; i++) {
      const particle = document.createElement('span');
      const size = Math.random() * 30 + 10; // 10-40px
      const posX = Math.random() * 100; // 0-100%
      const posY = Math.random() * 100; // 0-100%
      const duration = Math.random() * 50 + 30; // 30-80s
      const delay = Math.random() * 10; // 0-10s
      
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;
      particle.style.left = `${posX}%`;
      particle.style.top = `${posY}%`;
      particle.style.opacity = `${Math.random() * 0.3 + 0.1}`; // 0.1-0.4
      particle.style.animation = `floatParticle ${duration}s linear ${delay}s infinite`;
      
      container.appendChild(particle);
    }
    
    // Add keyframes for floating animation
    if (!document.getElementById('particle-keyframes')) {
      const style = document.createElement('style');
      style.id = 'particle-keyframes';
      style.textContent = `
        @keyframes floatParticle {
          0% {
            transform: translate(0, 0) rotate(0deg);
          }
          25% {
            transform: translate(100px, 50px) rotate(90deg);
          }
          50% {
            transform: translate(50px, 100px) rotate(180deg);
          }
          75% {
            transform: translate(-50px, 50px) rotate(270deg);
          }
          100% {
            transform: translate(0, 0) rotate(360deg);
          }
        }
      `;
      document.head.appendChild(style);
    }
    
    return container;
  };
  
  const particlesContainer = createParticles();
  
  // Enhanced mouse movement handler with depth effect
  const handleMouseMove = (event: MouseEvent): void => {
    const { clientX, clientY } = event;
    const x = (clientX / window.innerWidth) * 100;
    const y = (clientY / window.innerHeight) * 100;
    
    // Calculate distance from center for depth effect
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const distanceX = (clientX - centerX) / centerX; // -1 to 1
    const distanceY = (clientY - centerY) / centerY; // -1 to 1
    
    // Add a subtle pulse effect when moving
    const pulseSize = Math.sin(Date.now() / 500) * 5 + 100; // Pulsing between 95% and 105%
    
    // Apply parallax effect based on mouse position
    document.documentElement.style.setProperty('--parallax-x', `${distanceX * 10}px`);
    document.documentElement.style.setProperty('--parallax-y', `${distanceY * 10}px`);
    
    (lightElement as HTMLElement).style.setProperty('--x', `${x}%`);
    (lightElement as HTMLElement).style.setProperty('--y', `${y}%`);
    (lightElement as HTMLElement).style.setProperty('--size', `${pulseSize}%`);
    
    // Add subtle tilt effect to cards
    const cards = document.querySelectorAll('.glass-card');
    cards.forEach((card) => {
      const rect = (card as HTMLElement).getBoundingClientRect();
      const cardCenterX = rect.left + rect.width / 2;
      const cardCenterY = rect.top + rect.height / 2;
      
      const cardDistanceX = (clientX - cardCenterX) / (window.innerWidth / 2);
      const cardDistanceY = (clientY - cardCenterY) / (window.innerHeight / 2);
      
      (card as HTMLElement).style.transform = `
        perspective(1000px) 
        rotateX(${-cardDistanceY * 2}deg) 
        rotateY(${cardDistanceX * 2}deg)
        translateZ(10px)
      `;
    });
  };
  
  // Add event listener for mouse movement
  document.addEventListener('mousemove', handleMouseMove);
  
  // Create a more pronounced animation for mobile devices or when mouse isn't moving
  let animationActive = true;
  
  const animateLight = (): void => {
    if (!animationActive) return;
    
    const time = Date.now() / 2000; // Faster animation
    const x = 50 + Math.sin(time) * 45; // Increased range from 30 to 45
    const y = 50 + Math.cos(time) * 45; // Increased range from 30 to 45
    const pulseSize = Math.sin(time * 2) * 10 + 100; // Pulsing between 90% and 110%
    
    (lightElement as HTMLElement).style.setProperty('--x', `${x}%`);
    (lightElement as HTMLElement).style.setProperty('--y', `${y}%`);
    (lightElement as HTMLElement).style.setProperty('--size', `${pulseSize}%`);
    
    // Add subtle color shift over time
    const hue = (time * 10) % 360;
    document.documentElement.style.setProperty('--dynamic-hue', `${hue}`);
    
    requestAnimationFrame(animateLight);
  };
  
  // Start animation for mobile devices
  if ('ontouchstart' in window) {
    animateLight();
  } else {
    // For desktop, start a subtle animation that will be overridden by mouse movement
    requestAnimationFrame(animateLight);
  }
  
  // Stop animation when mouse is detected
  document.addEventListener('mousemove', () => {
    animationActive = false;
  }, { once: true });
  
  // Add scroll parallax effect
  const handleScroll = () => {
    const scrollY = window.scrollY;
    const parallaxValue = scrollY * 0.05; // Adjust speed as needed
    
    document.documentElement.style.setProperty('--scroll-parallax', `${parallaxValue}px`);
  };
  
  window.addEventListener('scroll', handleScroll);
  
  // Clean up function
  return () => {
    document.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('scroll', handleScroll);
    if (particlesContainer) {
      document.body.removeChild(particlesContainer);
    }
    animationActive = false;
  };
}; 