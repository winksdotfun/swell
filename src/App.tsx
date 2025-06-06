import { useState, useEffect } from 'react'
import './App.css'
import StakeForm from './components/StakeForm'

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="h-screen flex justify-center items-center outfit-font bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin">
            <img src="/assets/icons/swbtc.webp" alt="swBTC" className="w-16 h-16" />
          </div>
          <p className="text-white/60">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='h-screen flex justify-center items-center outfit-font'>
      <div className=" ">
        <div className="swell-bg">
          <div className="swell-grid" />
          <div className="glow-effect glow-1" />
          <div className="glow-effect glow-2" />
        </div>

        <StakeForm />
      </div>
    </div>
  )
}

export default App
